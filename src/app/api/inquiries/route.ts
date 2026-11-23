import { cleanText } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'
import { ENQUIRY_TYPES } from '@/lib/email/defaults'
import { makeReference } from '@/lib/email/config'
import { attributionFrom, handleMarketingOptIn, identify } from '@/lib/email/intake'
import { emitEvent } from '@/lib/email/events'
import { recordConversion } from '@/lib/email/attribution'
import { kickWorker } from '@/lib/email/worker'

// GET all inquiries (admin only)
export async function GET() {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inquiries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inquiries' },
      { status: 500 }
    )
  }

  // Transform to camelCase
  const inquiries = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    propertyId: row.property_id,
    status: row.status,
    createdAt: row.created_at,
    reference: row.reference,
    enquiryType: row.enquiry_type,
    leadId: row.lead_id,
  }))

  return NextResponse.json(inquiries)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TYPES = new Set(ENQUIRY_TYPES.map(t => t.value))

// POST create new inquiry (public)
export async function POST(request: NextRequest) {
  try {
    const raw = await readJson(request, 16 * 1024)
    if (raw instanceof NextResponse) return raw

    // Hidden "website" field: real visitors never fill it in, bots usually do
    if (raw.website) return NextResponse.json({ success: true }, { status: 201 })

    const limitKey = `inquiry:${clientIp(request)}`
    if (isLimited(limitKey, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'You’ve sent several messages already. Please call or WhatsApp us instead.' }, { status: 429 })
    }

    const propertyId = typeof raw.propertyId === 'string' && UUID.test(raw.propertyId) ? raw.propertyId : null
    const requestedType = cleanText(raw.enquiryType, 40)
    const body = {
      name: cleanText(raw.name, 120),
      email: cleanText(raw.email, 200).toLowerCase(),
      phone: cleanText(raw.phone, 40),
      message: cleanText(raw.message, 3000),
      propertyId,
      enquiryType: TYPES.has(requestedType) ? requestedType : propertyId ? 'property' : 'general',
      budget: cleanText(raw.budget, 80) || null,
      location: cleanText(raw.location, 120) || null,
      marketingConsent: raw.marketingConsent === true,
    }

    const missing = (['name', 'email', 'phone', 'message'] as const).find(f => !body[f])
    if (missing) {
      return NextResponse.json({ error: `Enter your ${missing}` }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Enter an email like name@example.com' }, { status: 400 })
    }
    if (body.phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Enter a phone number we can reach you on' }, { status: 400 })
    }
    rateLimit(limitKey, 5, 10 * 60 * 1000)

    const supabase = await createAdminClient()
    const attr = attributionFrom(raw, propertyId ? 'property_listing' : 'website')
    const kind = ENQUIRY_TYPES.find(t => t.value === body.enquiryType)?.kind || 'buyer'

    // Lead (CRM) and contact (email) records, created or matched by email/phone
    let who: Awaited<ReturnType<typeof identify>> = { leadId: null, contact: null, leadCreated: false }
    try {
      who = await identify(
        { name: body.name, email: body.email, phone: body.phone, kind, propertyId, visitorId: cleanText(raw.visitorId, 100) || null },
        attr, { contactSource: attr.source === 'website' && propertyId ? 'property_listing' : attr.source },
      )
    } catch (err) {
      // The enquiry itself must never be lost because the CRM step failed
      console.error('identify failed', err)
    }

    let reference = makeReference('SC')
    let data: Record<string, unknown> | null = null
    let error: { message: string; code?: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await supabase.from('inquiries').insert({
        name: body.name, email: body.email, phone: body.phone, message: body.message, property_id: propertyId,
        reference, enquiry_type: body.enquiryType, budget: body.budget, preferred_location: body.location,
        marketing_consent: body.marketingConsent, source: attr.source, attribution: attr,
        lead_id: who.leadId, contact_id: who.contact?.id || null,
      }).select().single()
      data = res.data; error = res.error
      if (!error || error.code !== '23505') break
      reference = makeReference('SC') // reference collision: try another
    }

    if (error || !data) {
      console.error('Error creating inquiry:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }
    const row = data as Record<string, unknown>

    // Everything below decides communication; it runs after the enquiry is safely stored
    try {
      let propertyType: string | null = null
      if (propertyId) propertyType = (await supabase.from('properties').select('type').eq('id', propertyId).maybeSingle()).data?.type || null
      const payload = {
        inquiry_id: row.id as string, lead_id: who.leadId, contact_id: who.contact?.id || null, property_id: propertyId,
        enquiry_type: body.enquiryType, property_type: propertyType, subject_key: `inquiry:${row.id}`,
      }
      if (who.leadCreated && who.leadId) {
        await emitEvent('lead.created', { ...payload, subject_key: `lead:${who.leadId}` }, `lead.created:${who.leadId}`)
        await recordConversion({ type: 'lead', entityId: who.leadId, contactId: who.contact?.id, leadId: who.leadId, propertyId })
      }
      await emitEvent('inquiry.created', payload, `inquiry.created:${row.id}`)
      await recordConversion({ type: 'enquiry', entityId: row.id as string, contactId: who.contact?.id, leadId: who.leadId, propertyId })
      if (body.marketingConsent && who.contact) await handleMarketingOptIn(who.contact, request, propertyId ? 'property_enquiry' : 'enquiry_form')
      kickWorker('inquiry')
    } catch (err) {
      console.error('Enquiry follow-up failed (the scheduled worker will retry):', err)
    }

    return NextResponse.json({
      id: row.id,
      reference: row.reference,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      propertyId: row.property_id,
      status: row.status,
      createdAt: row.created_at,
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
