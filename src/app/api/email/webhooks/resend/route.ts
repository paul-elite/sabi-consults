import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/email/config'
import { verifyResendWebhook } from '@/lib/email/provider'
import { recordConsent } from '@/lib/email/contacts'
import { emitEvent } from '@/lib/email/events'

/**
 * Delivery events from Resend: delivered, bounced, complained, delayed, opened, clicked.
 * Verified with the Svix signature; each webhook id is stored once, so a
 * retried delivery from Resend changes nothing the second time.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  if (body.length > 256 * 1024) return NextResponse.json({ error: 'Too large' }, { status: 413 })
  const check = verifyResendWebhook(body, request.headers)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 401 })

  let evt: { type?: string; created_at?: string; data?: Record<string, any> }
  try { evt = JSON.parse(body) } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const type = String(evt.type || '').replace(/^email\./, '')
  const providerId = evt.data?.email_id as string | undefined
  const client = db()

  const { data: m } = providerId
    ? await client.from('email_messages').select('id, contact_id, status, delivered_at, opened_at, clicked_at, click_count, open_count').eq('provider_id', providerId).maybeSingle()
    : { data: null }

  const { error: dup } = await client.from('email_events').insert({
    message_id: m?.id || null, contact_id: m?.contact_id || null, type, provider_event_id: check.id,
    url: evt.data?.click?.link?.slice(0, 1000) || null,
    payload: { bounce: evt.data?.bounce || null, to: evt.data?.to || null, subject: evt.data?.subject || null },
    occurred_at: evt.created_at || new Date().toISOString(),
  })
  if (dup?.code === '23505') return NextResponse.json({ ok: true, duplicate: true })
  await client.from('site_settings').upsert({ key: 'email_last_webhook_at', value: new Date().toISOString() })
  if (!m) return NextResponse.json({ ok: true, matched: false })

  const now = evt.created_at || new Date().toISOString()
  switch (type) {
    case 'delivered':
      if (m.status === 'sent') await client.from('email_messages').update({ status: 'delivered', delivered_at: now }).eq('id', m.id)
      break
    case 'bounced': {
      // Permanent bounces stop all mail to the address; temporary ones are only counted
      const permanent = /permanent|hard/i.test(String(evt.data?.bounce?.type || 'Permanent'))
      await client.from('email_messages').update({ status: 'bounced', status_reason: String(evt.data?.bounce?.message || 'Bounced').slice(0, 300) }).eq('id', m.id)
      if (m.contact_id) {
        const { data: c } = await client.from('contacts').select('bounce_count').eq('id', m.contact_id).maybeSingle()
        const count = (c?.bounce_count || 0) + 1
        const suppress = permanent || count >= 3
        await client.from('contacts').update({ bounce_count: count, ...(suppress ? { suppressed: true, suppression_reason: permanent ? 'Hard bounce' : 'Repeated bounces' } : {}) }).eq('id', m.contact_id)
        if (suppress) await client.from('email_messages').update({ status: 'cancelled', status_reason: 'Address suppressed after bounce' }).eq('contact_id', m.contact_id).eq('status', 'queued')
      }
      break
    }
    case 'complained':
      await client.from('email_messages').update({ status: 'complained' }).eq('id', m.id)
      if (m.contact_id) {
        await client.from('contacts').update({ suppressed: true, suppression_reason: 'Marked as spam', marketing_status: 'unsubscribed', unsubscribed_at: now }).eq('id', m.contact_id)
        await recordConsent(m.contact_id, 'unsubscribed', { source: 'spam_complaint', actor: 'provider' })
        await client.from('email_messages').update({ status: 'cancelled', status_reason: 'Spam complaint' }).eq('contact_id', m.contact_id).eq('status', 'queued')
        await emitEvent('subscriber.unsubscribed', { contact_id: m.contact_id, scope: 'all' }, `unsub:complaint:${m.id}`)
      }
      break
    case 'opened':
      await client.from('email_messages').update({ opened_at: m.opened_at || now, open_count: (m.open_count || 0) + 1 }).eq('id', m.id)
      break
    case 'clicked':
      // Our own tracked links already record clicks; this covers links Resend tracked
      if (!m.clicked_at) await client.from('email_messages').update({ clicked_at: now, click_count: (m.click_count || 0) + 1 }).eq('id', m.id)
      break
    case 'delivery_delayed':
      break
    case 'failed':
      await client.from('email_messages').update({ status: 'failed', status_reason: String(evt.data?.failed?.reason || 'Provider reported failure').slice(0, 300) }).eq('id', m.id)
      break
  }
  return NextResponse.json({ ok: true })
}
