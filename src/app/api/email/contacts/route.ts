import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail } from '@/lib/email/config'
import { recordConsent, upsertContact } from '@/lib/email/contacts'
import { CONTACT_KINDS } from '@/lib/email/defaults'
import { cleanInterests } from '@/lib/email/forms'
import { bad } from '@/lib/email/api'

const KINDS = new Set(CONTACT_KINDS.map(k => k.value))

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const p = request.nextUrl.searchParams
  const page = Math.max(0, Number(p.get('page')) || 0)
  const size = 50
  let q = db().from('contacts')
    .select('id, email, name, phone, kind, tags, source, marketing_status, suppressed, last_engaged_at, last_emailed_at, created_at, archived_at, lead_id, lead:leads(id, status, score, quality)', { count: 'exact' })
    .order('created_at', { ascending: false }).range(page * size, page * size + size - 1)
  const search = p.get('q')?.trim().slice(0, 80)
  if (search) {
    const s = search.replace(/[%,()*]/g, ' ')
    q = q.or(`email.ilike.%${s}%,name.ilike.%${s}%,phone.ilike.%${s}%`)
  }
  if (p.get('archived') === '1') q = q.not('archived_at', 'is', null)
  else q = q.is('archived_at', null)
  if (p.get('kind') && KINDS.has(String(p.get('kind')))) q = q.eq('kind', String(p.get('kind')))
  const status = p.get('status')
  if (status === 'suppressed') q = q.eq('suppressed', true)
  else if (status && ['none', 'pending', 'subscribed', 'unsubscribed'].includes(status)) q = q.eq('marketing_status', status)
  if (p.get('tag')) q = q.contains('tags', [String(p.get('tag'))])
  if (p.get('source')) q = q.eq('source', String(p.get('source')))
  const { data, count, error } = await q
  if (error) return bad(error.message, 500)
  return NextResponse.json({ rows: data || [], total: count || 0, page, size })
}

// Create a contact by hand
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const email = cleanText(raw.email, 200).toLowerCase()
  if (!isEmail(email)) return bad('Enter a valid email address')
  const kind = KINDS.has(String(raw.kind)) ? String(raw.kind) : 'buyer'
  const { data: exists } = await db().from('contacts').select('id').eq('email', email).maybeSingle()
  if (exists) return NextResponse.json({ error: 'A contact with this email already exists', id: exists.id }, { status: 409 })
  const contact = await upsertContact({
    email, name: cleanText(raw.name, 120) || null, phone: cleanText(raw.phone, 40) || null, kind,
    source: cleanText(raw.source, 40) || 'admin', tags: Array.isArray(raw.tags) ? raw.tags.map(t => cleanText(t, 40)).filter(Boolean) : [],
    interests: raw.interests ? cleanInterests(raw.interests) : undefined,
  })
  // Staff can only mark someone subscribed when they confirm the person agreed (e.g. in writing)
  if (raw.consentAttested === true) {
    const now = new Date().toISOString()
    await db().from('contacts').update({ marketing_status: 'subscribed', consent_at: now, confirmed_at: now, consent_source: `admin:${auth.name}` }).eq('id', contact.id)
    await recordConsent(contact.id, 'subscribed', { actor: auth.name, source: 'admin_attested', wording: cleanText(raw.consentNote, 300) || 'Consent confirmed by staff' })
  }
  return NextResponse.json(contact, { status: 201 })
}
