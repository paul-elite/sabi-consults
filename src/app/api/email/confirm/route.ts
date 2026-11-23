import { NextRequest, NextResponse } from 'next/server'
import { clientIp, readJson } from '@/lib/rate-limit'
import { confirmSubscription, readContactToken } from '@/lib/email/contacts'
import { emitEvent } from '@/lib/email/events'
import { queueEmail } from '@/lib/email/send'
import { db } from '@/lib/email/config'
import { kickWorker } from '@/lib/email/worker'

// Double opt-in confirmation. A button press (POST), so link scanners that open
// every URL in an email can't confirm on someone's behalf.
export async function POST(request: NextRequest) {
  const raw = await readJson(request, 2048)
  if (raw instanceof NextResponse) return raw
  const id = readContactToken(String(raw.t || ''), 'confirm')
  if (!id) return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 404 })
  const before = (await db().from('contacts').select('marketing_status').eq('id', id).maybeSingle()).data
  const c = await confirmSubscription(id, { ip: clientIp(request), userAgent: request.headers.get('user-agent') || undefined })
  if (!c) return NextResponse.json({ error: 'We couldn’t find your details' }, { status: 404 })
  if (before?.marketing_status !== 'subscribed') {
    await emitEvent('subscriber.confirmed', { contact_id: id, lead_id: c.lead_id, subject_key: `sub:${id}` }, `subscriber.confirmed:${id}:${new Date().toISOString().slice(0, 10)}`)
    // Any alerts they set up are now live: tell them
    const { count } = await db().from('property_alerts').select('id', { count: 'exact', head: true }).eq('contact_id', id).eq('active', true)
    if (count) {
      await queueEmail({
        to: c.email, toName: c.name, contactId: id, templateKey: 'alert_confirmed', category: 'transactional',
        context: { vars: { alert_summary: `You have ${count} active alert${count > 1 ? 's' : ''}.` } }, idempotencyKey: `alert-confirmed:${id}`,
      })
    }
    kickWorker('confirm')
  }
  return NextResponse.json({ ok: true })
}
