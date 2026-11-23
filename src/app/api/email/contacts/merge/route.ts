import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { db, isUuid } from '@/lib/email/config'
import { recordConsent } from '@/lib/email/contacts'
import { bad } from '@/lib/email/api'

// Likely duplicates: different email addresses with the same phone number or the same name
export async function GET() {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { data } = await db().from('contacts').select('id, email, name, phone, marketing_status, created_at').is('archived_at', null).limit(20000)
  const groups = new Map<string, typeof data>()
  for (const c of data || []) {
    const phone = (c.phone || '').replace(/\D/g, '').slice(-10)
    const keys = [phone.length >= 7 ? `phone:${phone}` : '', c.name && c.name.trim().split(/\s+/).length > 1 ? `name:${c.name.trim().toLowerCase().replace(/\s+/g, ' ')}` : ''].filter(Boolean)
    for (const k of keys) groups.set(k, [...(groups.get(k) || []), c])
  }
  const out = [...groups.entries()].filter(([, v]) => (v?.length || 0) > 1).map(([key, contacts]) => ({ key, reason: key.startsWith('phone') ? 'Same phone number' : 'Same name', contacts }))
  return NextResponse.json(out.slice(0, 100))
}

/** Merges "mergeId" into "keepId": history, alerts, enquiries and consent move across; the duplicate is deleted. */
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const keepId = String(raw.keepId || ''), mergeId = String(raw.mergeId || '')
  if (!isUuid(keepId) || !isUuid(mergeId) || keepId === mergeId) return bad('Choose two different contacts')
  const client = db()
  const [{ data: keep }, { data: drop }] = await Promise.all([
    client.from('contacts').select('*').eq('id', keepId).maybeSingle(),
    client.from('contacts').select('*').eq('id', mergeId).maybeSingle(),
  ])
  if (!keep || !drop) return bad('Contact not found', 404)

  for (const table of ['consent_records', 'email_messages', 'email_events', 'automation_runs', 'inquiries', 'viewing_requests', 'transactions', 'email_attributions', 'app_events']) {
    await client.from(table).update({ contact_id: keepId }).eq('contact_id', mergeId)
  }
  await client.from('referrals').update({ referrer_contact_id: keepId }).eq('referrer_contact_id', mergeId)
  // Alerts: move, skipping watches the kept contact already has
  const { data: alerts } = await client.from('property_alerts').select('id, property_id').eq('contact_id', mergeId)
  const { data: keepWatches } = await client.from('property_alerts').select('property_id').eq('contact_id', keepId).not('property_id', 'is', null)
  const watched = new Set((keepWatches || []).map(w => w.property_id))
  for (const a of alerts || []) {
    if (a.property_id && watched.has(a.property_id)) await client.from('property_alerts').delete().eq('id', a.id)
    else await client.from('property_alerts').update({ contact_id: keepId }).eq('id', a.id)
  }
  // The stricter consent wins: an unsubscribe on either record is kept
  const marketing = keep.marketing_status === 'unsubscribed' || drop.marketing_status === 'unsubscribed' ? 'unsubscribed'
    : keep.marketing_status === 'subscribed' || drop.marketing_status === 'subscribed' ? 'subscribed'
      : keep.marketing_status === 'pending' || drop.marketing_status === 'pending' ? 'pending' : 'none'
  await client.from('contacts').update({
    name: keep.name || drop.name, phone: keep.phone || drop.phone, lead_id: keep.lead_id || drop.lead_id,
    tags: Array.from(new Set([...(keep.tags || []), ...(drop.tags || [])])),
    marketing_status: marketing, followups_opt_out: keep.followups_opt_out || drop.followups_opt_out,
    suppressed: keep.suppressed || drop.suppressed, birthday: keep.birthday || drop.birthday,
    notes: [keep.notes, drop.notes ? `Merged from ${drop.email}: ${drop.notes}` : `Merged from ${drop.email}`].filter(Boolean).join('\n'),
  }).eq('id', keepId)
  await client.from('contacts').delete().eq('id', mergeId)
  await recordConsent(keepId, 'merged', { actor: auth.name, source: `merged:${drop.email}` })
  return NextResponse.json({ ok: true })
}
