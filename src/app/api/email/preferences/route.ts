import { NextRequest, NextResponse } from 'next/server'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'
import { db, isUuid } from '@/lib/email/config'
import { readContactToken, recordConsent, requestMarketingConsent, unsubscribe } from '@/lib/email/contacts'
import { cleanInterests, describe } from '@/lib/email/forms'
import { emitEvent } from '@/lib/email/events'
import { kickWorker } from '@/lib/email/worker'

// Preference centre, opened from the signed link in every email (no sign-in)
export async function GET(request: NextRequest) {
  const id = readContactToken(request.nextUrl.searchParams.get('t'), 'prefs')
  if (!id) return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 404 })
  const client = db()
  const { data: c } = await client.from('contacts').select('email, name, marketing_status, followups_opt_out, frequency, interests').eq('id', id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'We couldn’t find your details' }, { status: 404 })
  const { data: alerts } = await client.from('property_alerts').select('id, criteria, active, property:properties(id, title)').eq('contact_id', id).order('created_at', { ascending: false })
  // Mask the address in case the link was forwarded
  const [user, domain] = c.email.split('@')
  return NextResponse.json({
    email: `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`,
    name: c.name, marketing: c.marketing_status, followups: !c.followups_opt_out, frequency: c.frequency, interests: c.interests || {},
    alerts: (alerts || []).map(a => ({ id: a.id, active: a.active, property: a.property, summary: a.property ? null : describe(cleanInterests(a.criteria)) })),
  })
}

export async function PUT(request: NextRequest) {
  const raw = await readJson(request, 8 * 1024)
  if (raw instanceof NextResponse) return raw
  const id = readContactToken(String(raw.t || ''), 'prefs')
  if (!id) return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 404 })
  const key = `prefs:${clientIp(request)}`
  if (isLimited(key, 30, 10 * 60_000)) return NextResponse.json({ error: 'Too many changes. Please wait a moment.' }, { status: 429 })
  rateLimit(key, 30, 10 * 60_000)
  const client = db()
  const { data: c } = await client.from('contacts').select('*').eq('id', id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'We couldn’t find your details' }, { status: 404 })
  const meta = { ip: clientIp(request), userAgent: request.headers.get('user-agent') || undefined, source: 'preference_centre' }

  const patch: Record<string, unknown> = {}
  if (['instant', 'weekly', 'important_only'].includes(String(raw.frequency))) patch.frequency = raw.frequency
  if (raw.interests) patch.interests = cleanInterests(raw.interests)
  if (typeof raw.followups === 'boolean' && raw.followups === c.followups_opt_out) {
    patch.followups_opt_out = !raw.followups
    await recordConsent(id, raw.followups ? 'followups_on' : 'followups_off', meta)
  }
  if (Object.keys(patch).length) await client.from('contacts').update(patch).eq('id', id)
  if (isUuid(raw.removeAlert)) await client.from('property_alerts').delete().eq('id', String(raw.removeAlert)).eq('contact_id', id)

  if (raw.marketing === false && c.marketing_status !== 'unsubscribed') await unsubscribe(id, 'marketing', meta)
  if (raw.marketing === true && c.marketing_status !== 'subscribed') {
    // They're using a link we emailed them, which proves the address: no second confirmation needed
    await requestMarketingConsent(c, { source: 'preference_centre', doubleOptIn: false, ip: meta.ip, userAgent: meta.userAgent })
    await client.from('property_alerts').update({ active: true }).eq('contact_id', id)
    await emitEvent('subscriber.confirmed', { contact_id: id, lead_id: c.lead_id, subject_key: `sub:${id}` }, `subscriber.confirmed:${id}:${new Date().toISOString().slice(0, 10)}`)
    kickWorker('prefs')
  }
  return NextResponse.json({ ok: true })
}
