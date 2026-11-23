// Shared by every public form: finds or creates the lead (CRM record) and the
// contact (email audience record), links them, and records where they came from.
import type { NextRequest } from 'next/server'
import { clientIp } from '@/lib/rate-limit'
import { db, getEmailSettings, isEmail } from './config'
import { upsertContact, requestMarketingConsent, type ContactRow, type Interests } from './contacts'
import { queueEmail } from './send'

export interface Attribution {
  source: string
  utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null
  referrer?: string | null; landing_page?: string | null
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '') || null

/** Works out the lead source from UTM tags and the referrer the form sent. */
export function attributionFrom(raw: Record<string, unknown>, fallback: string): Attribution {
  const pick = (a: string, b: string) => raw[a] ?? raw[b]
  const utm_source = clip(pick('utmSource', 'utm_source'), 100), utm_medium = clip(pick('utmMedium', 'utm_medium'), 100)
  const referrer = clip(raw.referrer, 500)
  const ref = (referrer || '').toLowerCase()
  const src = (utm_source || '').toLowerCase(), med = (utm_medium || '').toLowerCase()
  let source = fallback
  if (src === 'email' || med === 'email') source = 'email'
  else if (/cpc|paid|ads?$|ppc|display/.test(med)) source = 'paid'
  else if (/facebook|instagram|twitter|x\.com|linkedin|tiktok|youtube|whatsapp|social/.test(src + ' ' + med + ' ' + ref)) source = 'social'
  else if (src === 'referral' || med === 'referral') source = 'referral'
  else if (ref.includes('google') || ref.includes('bing')) source = 'search'
  return {
    source, utm_source, utm_medium, utm_campaign: clip(pick('utmCampaign', 'utm_campaign'), 200), utm_content: clip(pick('utmContent', 'utm_content'), 200),
    referrer, landing_page: clip(raw.landingPage, 200),
  }
}

export interface Person {
  name: string
  email?: string | null
  phone?: string | null
  kind?: string
  visitorId?: string | null
  propertyId?: string | null
  interests?: Interests
}

export interface Identified { leadId: string | null; contact: ContactRow | null; leadCreated: boolean }

export async function identify(person: Person, attr: Attribution, opts: { contactSource: string; sourceDetail?: string | null } = { contactSource: 'website' }): Promise<Identified> {
  const client = db()
  const email = person.email && isEmail(person.email.toLowerCase()) ? person.email.toLowerCase() : null
  let leadId: string | null = null
  let leadCreated = false

  // Leads need a phone number in the existing CRM; email-only sign-ups stay contacts only
  if (person.phone || email) {
    let existing: { id: string } | null = null
    if (email) existing = (await client.from('leads').select('id').eq('email', email).limit(1).maybeSingle()).data
    if (!existing && person.phone) existing = (await client.from('leads').select('id').eq('phone', person.phone).limit(1).maybeSingle()).data
    if (existing) {
      leadId = existing.id
      const patch: Record<string, unknown> = { last_activity_at: new Date().toISOString() }
      if (email) patch.email = email
      await client.from('leads').update(patch).eq('id', leadId)
    } else if (person.phone) {
      const { data } = await client.from('leads').insert({
        name: person.name, email, phone: person.phone, whatsapp: person.phone, kind: person.kind || 'buyer',
        visitor_id: person.visitorId || null, source: attr.source,
        utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign, utm_content: attr.utm_content,
        referrer: attr.referrer, landing_page: attr.landing_page,
        most_viewed_property_id: person.propertyId || null,
      }).select('id').single()
      if (data) { leadId = data.id; leadCreated = true }
      if (leadId && person.visitorId) {
        const { error } = await client.rpc('link_visitor_to_lead', { p_lead_id: leadId, p_visitor_id: person.visitorId })
        if (error) console.error('link_visitor_to_lead', error.message)
      }
    }
  }

  let contact: ContactRow | null = null
  if (email) {
    contact = await upsertContact({
      email, name: person.name, phone: person.phone, kind: person.kind, leadId,
      source: opts.contactSource, sourceDetail: opts.sourceDetail || person.propertyId || null,
      utm: { utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign },
      interests: person.interests,
    })
    if (leadId && contact.lead_id !== leadId && !contact.lead_id) contact.lead_id = leadId
  }
  if (leadId && person.propertyId) {
    await client.from('lead_property_interests').upsert({
      lead_id: leadId, property_id: person.propertyId, interest_type: 'inquired', inquired_at: new Date().toISOString(),
    }, { onConflict: 'lead_id,property_id' })
  }
  return { leadId, contact, leadCreated }
}

/** Handles the optional "send me property updates" box. Sends a confirmation link when double opt-in is on. */
export async function handleMarketingOptIn(contact: ContactRow, request: NextRequest, source: string, label = 'property updates') {
  const settings = await getEmailSettings()
  const result = await requestMarketingConsent(contact, {
    source, doubleOptIn: settings.doubleOptIn, ip: clientIp(request), userAgent: request.headers.get('user-agent') || undefined,
  })
  if (result === 'pending') {
    await queueEmail({
      to: contact.email, toName: contact.name, contactId: contact.id, templateKey: 'subscribe_confirm', category: 'transactional',
      context: { vars: { subscription_label: label } }, idempotencyKey: `confirm:${contact.id}:${new Date().toISOString().slice(0, 13)}`,
    })
  }
  if (result === 'subscribed') {
    const { emitEvent } = await import('./events')
    await emitEvent('subscriber.confirmed', { contact_id: contact.id, lead_id: contact.lead_id, subject_key: `sub:${contact.id}` }, `subscriber.confirmed:${contact.id}:${new Date().toISOString().slice(0, 10)}`)
  }
  return result
}
