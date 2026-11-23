import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail, isUuid } from '@/lib/email/config'
import { CAMPAIGN_TYPES } from '@/lib/email/defaults'
import { cleanAudience, cleanExclude, countAudience } from '@/lib/email/audience'
import { previewTemplate, queueEmail } from '@/lib/email/send'
import { getTemplate } from '@/lib/email/store'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

async function load(id: string) {
  const { data } = await db().from('campaigns').select('*').eq('id', id).maybeSingle()
  return data
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const c = await load(id)
  if (!c) return bad('Not found', 404)
  const client = db()
  const { data: rows } = await client.from('email_messages').select('status, opened_at, clicked_at').eq('campaign_id', id).limit(50000)
  const s = { total: 0, queued: 0, sent: 0, delivered: 0, bounced: 0, complained: 0, failed: 0, skipped: 0, opened: 0, clicked: 0 }
  for (const r of rows || []) {
    s.total++
    if (['queued', 'sending'].includes(r.status)) s.queued++
    if (['sent', 'delivered', 'bounced', 'complained'].includes(r.status)) s.sent++
    if (r.status === 'delivered') s.delivered++
    if (r.status === 'bounced') s.bounced++
    if (r.status === 'complained') s.complained++
    if (r.status === 'failed') s.failed++
    if (['skipped', 'cancelled'].includes(r.status)) s.skipped++
    if (r.opened_at) s.opened++
    if (r.clicked_at) s.clicked++
  }
  const { data: conv } = await client.from('email_attributions').select('conversion_type, model').eq('campaign_id', id)
  return NextResponse.json({ ...c, stats: s, conversions: conv || [] })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const c = await load(id)
  if (!c) return bad('Not found', 404)
  if (!['draft', 'scheduled', 'paused'].includes(c.status)) return bad('A campaign can’t be edited once it is sending or sent')
  const raw = await readJson(request, 128 * 1024)
  if (raw instanceof NextResponse) return raw
  const patch: Record<string, unknown> = {}
  if (raw.name !== undefined) patch.name = cleanText(raw.name, 120) || c.name
  if (raw.type && CAMPAIGN_TYPES.some(t => t.value === raw.type)) patch.type = raw.type
  if (raw.templateKey) {
    const t = await getTemplate(String(raw.templateKey))
    if (!t || t.audience !== 'marketing') return bad('Choose a marketing template')
    patch.template_key = t.key
  }
  if (raw.subject !== undefined) patch.subject = cleanText(raw.subject, 200)
  if (raw.preheader !== undefined) patch.preheader = cleanText(raw.preheader, 200) || null
  // Body is the campaign's own markup; it's escaped on render like any template text
  if (raw.body !== undefined) patch.body = String(raw.body).replace(/<[^>]*>/g, '').slice(0, 20000)
  if (Array.isArray(raw.propertyIds)) patch.property_ids = raw.propertyIds.filter(isUuid).slice(0, 8)
  if (raw.audience !== undefined) patch.audience = cleanAudience(raw.audience)
  if (raw.exclude !== undefined) patch.exclude = cleanExclude(raw.exclude)
  const { data, error } = await db().from('campaigns').update(patch).eq('id', id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const c = isUuid(id) ? await load(id) : null
  if (!c) return bad('Not found', 404)
  if (c.status !== 'draft') return bad('Only drafts can be deleted. Cancel the campaign instead.')
  await db().from('campaigns').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}

/** Actions: preview, count, test, schedule, send_now, pause, resume, cancel, duplicate */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const c = isUuid(id) ? await load(id) : null
  if (!c) return bad('Not found', 404)
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const action = String(raw.action || '')

  const ready = () => {
    if (!c.subject?.trim()) return 'Add a subject line'
    if (!c.body?.trim() && !(c.property_ids || []).length) return 'Add some content or choose properties to feature'
    return null
  }

  switch (action) {
    case 'preview': {
      const tpl = await getTemplate(c.template_key)
      if (!tpl) return bad('Template not found')
      const r = await previewTemplate({ ...tpl, subject: c.subject || tpl.subject, preheader: c.preheader || tpl.preheader, body: tpl.body.replace('{{campaign_body}}', c.body || ''), audience: 'marketing' },
        { property_ids: c.property_ids || [], vars: { campaign_subject: c.subject } }, null)
      return NextResponse.json(r)
    }
    case 'count': {
      const r = await countAudience(client, cleanAudience(c.audience), cleanExclude(c.exclude))
      return NextResponse.json(r)
    }
    case 'test': {
      const to = String(raw.to || auth.email).toLowerCase()
      if (!isEmail(to)) return bad('Enter a valid email for the test')
      const err = ready(); if (err) return bad(err)
      // Test sends use the campaign but aren't counted in its results
      const q = await queueEmail({
        to, templateKey: c.template_key, category: 'internal', context: { campaign_id: id, property_ids: c.property_ids || [], vars: { campaign_subject: c.subject } },
        idempotencyKey: `campaign-test:${id}:${to}:${Date.now()}`, createdBy: auth.name,
      })
      await client.from('email_messages').update({ campaign_id: null, context: { campaign_test: id, property_ids: c.property_ids || [] } }).eq('id', q.id)
      // Render with the campaign text: the worker reads campaign_test
      kickWorker('campaign-test')
      return NextResponse.json({ ok: true, messageId: q.id })
    }
    case 'schedule':
    case 'send_now': {
      if (!['draft', 'paused', 'scheduled'].includes(c.status)) return bad(`This campaign is ${c.status}`)
      const err = ready(); if (err) return bad(err)
      const { count } = await countAudience(client, cleanAudience(c.audience), cleanExclude(c.exclude))
      if (!count) return bad('No subscribed contacts match this audience')
      if (action === 'schedule') {
        const at = new Date(String(raw.scheduledAt || ''))
        if (isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) return bad('Choose a time in the future')
        await client.from('campaigns').update({ status: 'scheduled', scheduled_at: at.toISOString() }).eq('id', id)
      } else {
        await client.from('campaigns').update({ status: 'sending', scheduled_at: new Date().toISOString(), started_at: c.started_at || new Date().toISOString() }).eq('id', id)
        kickWorker('campaign')
      }
      return NextResponse.json({ ok: true, recipients: count })
    }
    case 'pause':
      if (!['sending', 'scheduled'].includes(c.status)) return bad('Only sending or scheduled campaigns can be paused')
      await client.from('campaigns').update({ status: 'paused' }).eq('id', id)
      return NextResponse.json({ ok: true })
    case 'resume':
      if (c.status !== 'paused') return bad('Campaign isn’t paused')
      await client.from('campaigns').update({ status: c.started_at ? 'sending' : 'scheduled', scheduled_at: c.scheduled_at || new Date().toISOString() }).eq('id', id)
      await client.from('email_messages').update({ send_after: new Date().toISOString() }).eq('campaign_id', id).eq('status', 'queued')
      kickWorker('campaign')
      return NextResponse.json({ ok: true })
    case 'cancel': {
      if (!['sending', 'scheduled', 'paused'].includes(c.status)) return bad('Nothing to cancel')
      await client.from('campaigns').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', id)
      const { count } = await client.from('email_messages').update({ status: 'cancelled', status_reason: `Campaign cancelled by ${auth.name}` }, { count: 'exact' }).eq('campaign_id', id).eq('status', 'queued')
      return NextResponse.json({ ok: true, cancelled: count || 0 })
    }
    case 'duplicate': {
      const { data } = await client.from('campaigns').insert({
        name: `${c.name} (copy)`, type: c.type, template_key: c.template_key, subject: c.subject, preheader: c.preheader, body: c.body,
        property_ids: c.property_ids, audience: c.audience, exclude: c.exclude, created_by: auth.name,
      }).select().single()
      return NextResponse.json(data, { status: 201 })
    }
  }
  return bad('Unknown action')
}
