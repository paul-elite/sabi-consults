import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isUuid } from '@/lib/email/config'
import { recordConsent, unsubscribe } from '@/lib/email/contacts'
import { CONTACT_KINDS } from '@/lib/email/defaults'
import { cleanInterests } from '@/lib/email/forms'
import { bad } from '@/lib/email/api'
import { emitEvent } from '@/lib/email/events'
import { kickWorker } from '@/lib/email/worker'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const client = db()
  const { data: c } = await client.from('contacts').select('*, lead:leads(id, name, status, score, quality, assigned_to, source, utm_campaign)').eq('id', id).maybeSingle()
  if (!c) return bad('Not found', 404)
  const leadId = c.lead_id as string | null
  const none = Promise.resolve({ data: [] as unknown[] })
  const [consent, alerts, emails, runs, inquiries, inspections, transactions, referrals, events, saved] = await Promise.all([
    client.from('consent_records').select('*').eq('contact_id', id).order('created_at', { ascending: false }).limit(50),
    client.from('property_alerts').select('id, criteria, active, created_at, last_sent_at, property:properties(id, title)').eq('contact_id', id),
    client.from('email_messages').select('id, category, template_key, subject, status, status_reason, send_after, sent_at, delivered_at, opened_at, clicked_at, campaign_id, automation_id, created_at').eq('contact_id', id).order('created_at', { ascending: false }).limit(100),
    client.from('automation_runs').select('id, status, step_index, next_run_at, exit_reason, last_error, started_at, finished_at, automation:automations(id, name, steps)').eq('contact_id', id).order('started_at', { ascending: false }).limit(50),
    client.from('inquiries').select('id, reference, enquiry_type, message, created_at, property:properties(id, title)').eq('contact_id', id).order('created_at', { ascending: false }),
    leadId ? client.from('viewing_requests').select('id, reference, status, preferred_date, confirmed_datetime, property:properties(id, title)').eq('lead_id', leadId).order('created_at', { ascending: false }) : none,
    client.from('transactions').select('id, reference, stage, agreed_price, amount_received, created_at, property:properties(id, title)').eq('contact_id', id).order('created_at', { ascending: false }),
    client.from('referrals').select('id, referred_name, status, created_at').eq('referrer_contact_id', id).order('created_at', { ascending: false }),
    client.from('email_events').select('id, type, url, occurred_at').eq('contact_id', id).order('occurred_at', { ascending: false }).limit(50),
    leadId ? client.from('lead_property_interests').select('interest_type, property:properties(id, title, status)').eq('lead_id', leadId) : none,
  ])
  return NextResponse.json({
    ...c, consent: consent.data, alerts: alerts.data, emails: emails.data, runs: runs.data, inquiries: inquiries.data,
    inspections: inspections.data, transactions: transactions.data, referrals: referrals.data, events: events.data, interests_properties: saved.data,
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const { data: c } = await client.from('contacts').select('*').eq('id', id).maybeSingle()
  if (!c) return bad('Not found', 404)

  const patch: Record<string, unknown> = {}
  if (raw.name !== undefined) patch.name = cleanText(raw.name, 120) || null
  if (raw.phone !== undefined) patch.phone = cleanText(raw.phone, 40) || null
  if (raw.kind && CONTACT_KINDS.some(k => k.value === raw.kind)) patch.kind = raw.kind
  if (Array.isArray(raw.tags)) patch.tags = Array.from(new Set(raw.tags.map(t => cleanText(t, 40).toLowerCase()).filter(Boolean))).slice(0, 40)
  if (raw.interests) patch.interests = cleanInterests(raw.interests)
  if (['instant', 'weekly', 'important_only'].includes(String(raw.frequency))) patch.frequency = raw.frequency
  if (raw.birthday !== undefined) patch.birthday = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.birthday)) ? raw.birthday : null
  if (raw.notes !== undefined) patch.notes = cleanText(raw.notes, 3000) || null
  if (typeof raw.followups === 'boolean') patch.followups_opt_out = !raw.followups
  if (raw.archived === true) patch.archived_at = new Date().toISOString()
  if (raw.archived === false) patch.archived_at = null
  if (raw.suppressed === false && c.suppressed) { patch.suppressed = false; patch.suppression_reason = null; patch.bounce_count = 0 }
  if (raw.suppressed === true) { patch.suppressed = true; patch.suppression_reason = cleanText(raw.suppressionReason, 120) || `Suppressed by ${auth.name}` }
  if (Object.keys(patch).length) {
    const { error } = await client.from('contacts').update(patch).eq('id', id)
    if (error) return bad(error.message, 500)
  }

  // Consent changes by staff are recorded with who made them
  if (raw.marketing === 'unsubscribed' && c.marketing_status !== 'unsubscribed') {
    await unsubscribe(id, 'marketing', { actor: auth.name, source: 'admin' })
  } else if (raw.marketing === 'subscribed' && c.marketing_status !== 'subscribed') {
    if (raw.consentAttested !== true) return bad('Confirm the person agreed to marketing emails before subscribing them')
    const now = new Date().toISOString()
    await client.from('contacts').update({ marketing_status: 'subscribed', consent_at: now, confirmed_at: now, consent_source: `admin:${auth.name}`, unsubscribed_at: null }).eq('id', id)
    await recordConsent(id, 'subscribed', { actor: auth.name, source: 'admin_attested', wording: cleanText(raw.consentNote, 300) || 'Consent confirmed by staff' })
    await emitEvent('subscriber.confirmed', { contact_id: id, lead_id: c.lead_id, subject_key: `sub:${id}` }, `subscriber.confirmed:${id}:${now.slice(0, 10)}`)
    kickWorker('admin-subscribe')
  }
  return NextResponse.json({ ok: true })
}

// Permanent erasure (NDPA right to erasure). Emails already sent keep only the address.
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const client = db()
  await client.from('email_messages').update({ html: null, context: {}, to_name: null }).eq('contact_id', id)
  await client.from('email_messages').update({ status: 'cancelled', status_reason: 'Contact erased' }).eq('contact_id', id).eq('status', 'queued')
  const { error } = await client.from('contacts').delete().eq('id', id)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true })
}
