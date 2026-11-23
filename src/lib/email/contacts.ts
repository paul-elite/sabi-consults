// Contacts, consent and the signed links that let someone manage their email
// without signing in.
import { hmacTag, verifyTag } from '@/lib/auth'
import { db, isEmail, siteUrl } from './config'

export interface ContactRow {
  id: string; email: string; name: string | null; phone: string | null; kind: string
  lead_id: string | null; tags: string[]; source: string | null; source_detail: string | null
  marketing_status: 'none' | 'pending' | 'subscribed' | 'unsubscribed'
  consent_at: string | null; consent_source: string | null; confirmed_at: string | null; unsubscribed_at: string | null
  followups_opt_out: boolean; frequency: 'instant' | 'weekly' | 'important_only'
  interests: Interests; birthday: string | null; customer_since: string | null
  suppressed: boolean; suppression_reason: string | null; bounce_count: number
  last_emailed_at: string | null; last_engaged_at: string | null; reactivation_sent_at: string | null
  notes: string | null; archived_at: string | null; created_at: string; updated_at: string
  utm: Record<string, string>
}

export interface Interests {
  types?: string[]; districts?: string[]; minBudget?: number | null; maxBudget?: number | null
  bedrooms?: number | null; topics?: string[]
}

export const CONSENT_WORDING = 'I’d like to receive property updates, new listings and news from Sabi Consults by email. I can unsubscribe at any time.'

export interface UpsertInput {
  email: string
  name?: string | null
  phone?: string | null
  kind?: string
  leadId?: string | null
  source?: string | null
  sourceDetail?: string | null
  utm?: Record<string, string | null | undefined>
  interests?: Interests
  tags?: string[]
}

/** Finds the contact for an email (case-insensitive) or creates it. Fills gaps, never overwrites known details with blanks. */
export async function upsertContact(input: UpsertInput): Promise<ContactRow> {
  const email = input.email.trim().toLowerCase()
  if (!isEmail(email)) throw new Error('Invalid email')
  const client = db()
  const { data: existing } = await client.from('contacts').select('*').eq('email', email).maybeSingle()
  if (existing) {
    const c = existing as ContactRow
    const patch: Record<string, unknown> = {}
    if (!c.name && input.name) patch.name = input.name
    if (!c.phone && input.phone) patch.phone = input.phone
    if (!c.lead_id && input.leadId) patch.lead_id = input.leadId
    if (input.kind && input.kind !== 'buyer' && c.kind === 'buyer') patch.kind = input.kind
    if (input.interests) patch.interests = mergeInterests(c.interests, input.interests)
    if (input.tags?.length) patch.tags = Array.from(new Set([...(c.tags || []), ...input.tags]))
    if (c.archived_at) patch.archived_at = null
    if (Object.keys(patch).length) {
      const { data } = await client.from('contacts').update(patch).eq('id', c.id).select('*').single()
      return (data || c) as ContactRow
    }
    return c
  }
  const utm = Object.fromEntries(Object.entries(input.utm || {}).filter(([, v]) => v)) as Record<string, string>
  const { data, error } = await client.from('contacts').insert({
    email, name: input.name || null, phone: input.phone || null, kind: input.kind || 'buyer',
    lead_id: input.leadId || null, source: input.source || 'website', source_detail: input.sourceDetail || null,
    utm, interests: input.interests || {}, tags: input.tags || [],
  }).select('*').single()
  if (error) {
    // Lost a race with a parallel insert of the same email: read the winner
    const { data: again } = await client.from('contacts').select('*').eq('email', email).maybeSingle()
    if (again) return again as ContactRow
    throw new Error(error.message)
  }
  return data as ContactRow
}

function mergeInterests(a: Interests = {}, b: Interests = {}): Interests {
  const uniq = (x?: string[], y?: string[]) => Array.from(new Set([...(x || []), ...(y || [])]))
  return {
    types: uniq(a.types, b.types),
    districts: uniq(a.districts, b.districts),
    topics: uniq(a.topics, b.topics),
    minBudget: b.minBudget ?? a.minBudget ?? null,
    maxBudget: b.maxBudget ?? a.maxBudget ?? null,
    bedrooms: b.bedrooms ?? a.bedrooms ?? null,
  }
}

export async function recordConsent(contactId: string, action: string, meta: { source?: string; ip?: string; userAgent?: string; actor?: string; wording?: string } = {}) {
  await db().from('consent_records').insert({
    contact_id: contactId, action, source: meta.source || null, ip: meta.ip || null,
    user_agent: meta.userAgent?.slice(0, 300) || null, actor: meta.actor || 'contact', wording: meta.wording || null,
  })
}

/**
 * Records that the person asked for marketing email. With double opt-in they
 * become "pending" until they click the confirmation link.
 */
export async function requestMarketingConsent(c: ContactRow, opts: { source: string; doubleOptIn: boolean; ip?: string; userAgent?: string }): Promise<'subscribed' | 'pending' | 'already'> {
  if (c.marketing_status === 'subscribed') return 'already'
  const now = new Date().toISOString()
  const confirmed = !opts.doubleOptIn
  await db().from('contacts').update({
    marketing_status: confirmed ? 'subscribed' : 'pending',
    consent_at: now, consent_source: opts.source,
    confirmed_at: confirmed ? now : null, unsubscribed_at: null,
  }).eq('id', c.id)
  await recordConsent(c.id, confirmed ? 'subscribed' : 'requested', { source: opts.source, ip: opts.ip, userAgent: opts.userAgent, wording: CONSENT_WORDING })
  return confirmed ? 'subscribed' : 'pending'
}

export async function confirmSubscription(contactId: string, meta: { ip?: string; userAgent?: string } = {}): Promise<ContactRow | null> {
  const client = db()
  const { data: c } = await client.from('contacts').select('*').eq('id', contactId).maybeSingle()
  if (!c) return null
  if (c.marketing_status === 'subscribed') return c as ContactRow
  const now = new Date().toISOString()
  const { data } = await client.from('contacts').update({
    marketing_status: 'subscribed', confirmed_at: now, consent_at: c.consent_at || now, unsubscribed_at: null,
  }).eq('id', contactId).select('*').single()
  await recordConsent(contactId, 'confirmed', { ...meta, source: c.consent_source || 'confirmation_link' })
  // Alerts created while pending start working now
  await client.from('property_alerts').update({ active: true }).eq('contact_id', contactId)
  return data as ContactRow
}

export async function unsubscribe(contactId: string, scope: 'marketing' | 'all', meta: { ip?: string; userAgent?: string; actor?: string; source?: string } = {}) {
  const client = db()
  const patch: Record<string, unknown> = { marketing_status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }
  if (scope === 'all') patch.followups_opt_out = true
  await client.from('contacts').update(patch).eq('id', contactId)
  await client.from('property_alerts').update({ active: false }).eq('contact_id', contactId).is('property_id', null)
  if (scope === 'all') await client.from('property_alerts').update({ active: false }).eq('contact_id', contactId)
  await recordConsent(contactId, scope === 'all' ? 'unsubscribed_all' : 'unsubscribed', { ...meta, source: meta.source || 'unsubscribe_link' })
  // Anything promotional already waiting is cancelled
  const categories = scope === 'all' ? ['marketing', 'service'] : ['marketing']
  await client.from('email_messages').update({ status: 'cancelled', status_reason: 'Unsubscribed' })
    .eq('contact_id', contactId).eq('status', 'queued').in('category', categories)
  const { emitEvent } = await import('./events')
  await emitEvent('subscriber.unsubscribed', { contact_id: contactId, scope }, `unsub:${contactId}:${Date.now()}`)
}

/* ------------------------------------------------------------- signed links */

const TOKEN_LEN = 24

export function contactToken(contactId: string, purpose: 'prefs' | 'unsub' | 'confirm'): string {
  return `${contactId}.${hmacTag(purpose, contactId, TOKEN_LEN)}`
}

export function readContactToken(token: string | null | undefined, purpose: 'prefs' | 'unsub' | 'confirm'): string | null {
  if (!token || token.length > 120) return null
  const [id, tag] = token.split('.')
  if (!id || !tag || !/^[0-9a-f-]{36}$/.test(id)) return null
  return verifyTag(purpose, id, tag, TOKEN_LEN) ? id : null
}

export const prefsUrl = (contactId: string) => `${siteUrl()}/email/preferences?t=${contactToken(contactId, 'prefs')}`
export const unsubscribeUrl = (contactId: string) => `${siteUrl()}/email/unsubscribe?t=${contactToken(contactId, 'unsub')}`
export const unsubscribeApiUrl = (contactId: string) => `${siteUrl()}/api/email/unsubscribe?t=${contactToken(contactId, 'unsub')}`
export const confirmUrl = (contactId: string) => `${siteUrl()}/email/confirm?t=${contactToken(contactId, 'confirm')}`

export const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || ''
