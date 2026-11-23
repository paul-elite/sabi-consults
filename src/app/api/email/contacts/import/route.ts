import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail } from '@/lib/email/config'
import { recordConsent, upsertContact } from '@/lib/email/contacts'
import { CONTACT_KINDS } from '@/lib/email/defaults'
import { bad, parseCsv } from '@/lib/email/api'

export const maxDuration = 60

/**
 * CSV import. Columns are matched by header name (email, name, phone, kind,
 * tags, birthday). Imported people are NOT subscribed to marketing unless
 * staff confirm they agreed, and that confirmation is recorded per contact.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request, 2 * 1024 * 1024)
  if (raw instanceof NextResponse) return raw
  const rows = parseCsv(String(raw.csv || ''))
  if (rows.length < 2) return bad('The file needs a header row and at least one contact')
  if (rows.length > 5001) return bad('Import up to 5,000 contacts at a time')
  const header = rows[0].map(h => h.trim().toLowerCase())
  const col = (names: string[]) => header.findIndex(h => names.includes(h))
  const ci = { email: col(['email', 'email address', 'e-mail']), name: col(['name', 'full name']), first: col(['first name', 'firstname']), last: col(['last name', 'lastname', 'surname']), phone: col(['phone', 'phone number', 'mobile', 'whatsapp']), kind: col(['kind', 'type', 'contact type']), tags: col(['tags', 'tag']), birthday: col(['birthday', 'date of birth', 'dob']) }
  if (ci.email < 0) return bad('No "email" column found')
  const defaultKind = CONTACT_KINDS.some(k => k.value === raw.kind) ? String(raw.kind) : 'buyer'
  const extraTags = Array.isArray(raw.tags) ? raw.tags.map(t => cleanText(t, 40).toLowerCase()).filter(Boolean) : []
  const attested = raw.consentAttested === true
  const consentNote = cleanText(raw.consentNote, 300)
  if (attested && !consentNote) return bad('Describe how these people agreed to marketing emails')

  const result = { created: 0, updated: 0, invalid: 0, duplicatesInFile: 0, subscribed: 0, errors: [] as string[] }
  const seen = new Set<string>()
  const client = db()
  for (const r of rows.slice(1)) {
    const email = cleanText(r[ci.email], 200).toLowerCase()
    if (!isEmail(email)) { result.invalid++; continue }
    if (seen.has(email)) { result.duplicatesInFile++; continue }
    seen.add(email)
    const name = ci.name >= 0 ? cleanText(r[ci.name], 120) : [ci.first >= 0 ? r[ci.first] : '', ci.last >= 0 ? r[ci.last] : ''].map(s => cleanText(s, 60)).filter(Boolean).join(' ')
    const kind = ci.kind >= 0 && CONTACT_KINDS.some(k => k.value === r[ci.kind]?.trim().toLowerCase()) ? r[ci.kind].trim().toLowerCase() : defaultKind
    const tags = [...extraTags, ...(ci.tags >= 0 ? (r[ci.tags] || '').split(/[;|]/).map(t => cleanText(t, 40).toLowerCase()).filter(Boolean) : []), 'imported']
    try {
      const { data: existed } = await client.from('contacts').select('id').eq('email', email).maybeSingle()
      const c = await upsertContact({ email, name: name || null, phone: ci.phone >= 0 ? cleanText(r[ci.phone], 40) || null : null, kind, source: 'import', tags })
      if (existed) result.updated++; else result.created++
      const bday = ci.birthday >= 0 ? String(r[ci.birthday] || '').trim() : ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(bday)) await client.from('contacts').update({ birthday: bday }).eq('id', c.id).is('birthday', null)
      // Never re-subscribe someone who unsubscribed
      if (attested && c.marketing_status !== 'subscribed' && c.marketing_status !== 'unsubscribed' && !c.suppressed) {
        const now = new Date().toISOString()
        await client.from('contacts').update({ marketing_status: 'subscribed', consent_at: now, confirmed_at: now, consent_source: 'import_attested' }).eq('id', c.id)
        await recordConsent(c.id, 'imported', { actor: auth.name, source: 'import_attested', wording: consentNote })
        result.subscribed++
      }
    } catch (err) {
      if (result.errors.length < 10) result.errors.push(`${email}: ${err instanceof Error ? err.message : 'error'}`)
    }
  }
  return NextResponse.json(result)
}
