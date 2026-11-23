import { NextRequest, NextResponse } from 'next/server'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail, isUuid } from '@/lib/email/config'
import { upsertContact } from '@/lib/email/contacts'
import { attributionFrom, handleMarketingOptIn } from '@/lib/email/intake'
import { emitEvent } from '@/lib/email/events'
import { queueEmail } from '@/lib/email/send'
import { kickWorker } from '@/lib/email/worker'
import { cleanInterests, describe } from '@/lib/email/forms'

/**
 * Property alerts. Either criteria ("3-bed houses in Gwarinpa under ₦120M")
 * or a watch on one listing (price and availability updates). Alerts only
 * start once the email address is confirmed.
 */
export async function POST(request: NextRequest) {
  const raw = await readJson(request, 8 * 1024)
  if (raw instanceof NextResponse) return raw
  if (raw.website) return NextResponse.json({ status: 'pending' })
  const key = `alert:${clientIp(request)}`
  if (isLimited(key, 10, 60 * 60_000)) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  const email = cleanText(raw.email, 200).toLowerCase()
  if (!isEmail(email)) return NextResponse.json({ error: 'Enter an email like name@example.com' }, { status: 400 })
  const propertyId = isUuid(raw.propertyId) ? String(raw.propertyId) : null
  const criteria = cleanInterests(raw.criteria)
  if (!propertyId && !criteria.types?.length && !criteria.districts?.length && !criteria.maxBudget && !criteria.bedrooms) {
    return NextResponse.json({ error: 'Choose at least one thing to be alerted about' }, { status: 400 })
  }
  rateLimit(key, 10, 60 * 60_000)
  const client = db()
  if (propertyId) {
    const { data: p } = await client.from('properties').select('id').eq('id', propertyId).maybeSingle()
    if (!p) return NextResponse.json({ error: 'That property is no longer listed' }, { status: 404 })
  }

  const attr = attributionFrom(raw, propertyId ? 'property_listing' : 'website')
  const contact = await upsertContact({
    email, name: cleanText(raw.name, 120) || null, source: propertyId ? 'property_listing' : 'property_alert', sourceDetail: propertyId,
    interests: propertyId ? undefined : criteria, utm: { utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign },
  })
  const subscribed = contact.marketing_status === 'subscribed'
  if (propertyId) {
    await client.from('property_alerts').upsert({ contact_id: contact.id, property_id: propertyId, active: subscribed, criteria: {} }, { onConflict: 'contact_id,property_id' })
    if (contact.lead_id) {
      await client.from('lead_property_interests').upsert({ lead_id: contact.lead_id, property_id: propertyId, interest_type: 'saved' }, { onConflict: 'lead_id,property_id' })
    }
    await emitEvent('property.saved', { contact_id: contact.id, lead_id: contact.lead_id, property_id: propertyId, subject_key: `watch:${contact.id}:${propertyId}` }, `property.saved:${contact.id}:${propertyId}`)
  } else {
    await client.from('property_alerts').insert({ contact_id: contact.id, criteria, active: subscribed })
  }

  const status = await handleMarketingOptIn(contact, request, propertyId ? 'property_watch' : 'property_alert', propertyId ? 'updates about this property and similar listings' : 'property alerts')
  if (status !== 'pending') {
    const summary = propertyId ? 'Price and availability changes for the property you saved.' : describe(criteria)
    await queueEmail({
      to: email, toName: contact.name, contactId: contact.id, templateKey: 'alert_confirmed', category: 'transactional',
      context: { property_id: propertyId, vars: { alert_summary: summary } }, idempotencyKey: `alert-ok:${contact.id}:${propertyId || summary}`,
    })
  }
  kickWorker('alert')
  return NextResponse.json({ status: status === 'pending' ? 'pending' : 'active' })
}

