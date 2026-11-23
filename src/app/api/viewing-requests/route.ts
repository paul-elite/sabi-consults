import { cleanText } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'
import { makeReference } from '@/lib/email/config'
import { attributionFrom, handleMarketingOptIn, identify } from '@/lib/email/intake'
import { emitEvent } from '@/lib/email/events'
import { recordConversion } from '@/lib/email/attribution'
import { kickWorker } from '@/lib/email/worker'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i


// GET all viewing requests (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

  const supabase = await createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const propertyId = searchParams.get('property_id')

  let query = supabase
    .from('viewing_requests')
    .select(`
      *,
      property:properties(id, title, district, images, price),
      lead:leads(id, name, email, phone, quality, score)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching viewing requests:', error)
    return NextResponse.json({ error: 'Failed to fetch viewing requests' }, { status: 500 })
  }

  const requests = (data || []).map(transformViewingRequest)
  return NextResponse.json(requests)
}

// POST create new viewing request (public)
export async function POST(request: NextRequest) {
  try {
    const raw = await readJson(request, 16 * 1024)
    if (raw instanceof NextResponse) return raw

    // Honeypot
    if (raw.website) return NextResponse.json({ success: true }, { status: 201 })

    // Rate limiting
    const limitKey = `viewing:${clientIp(request)}`
    if (isLimited(limitKey, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    // Validate required fields
    const name = cleanText(raw.name, 120)
    if (!name) {
      return NextResponse.json({ error: 'Name is required', field: 'name' }, { status: 400 })
    }

    const phone = cleanText(raw.phone, 40)
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Valid phone number is required', field: 'phone' }, { status: 400 })
    }

    const propertyId = typeof raw.propertyId === 'string' ? raw.propertyId : ''
    if (!UUID.test(propertyId)) {
      return NextResponse.json({ error: 'Property is required' }, { status: 400 })
    }

    const email = raw.email ? cleanText(raw.email, 200).toLowerCase() : null
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address', field: 'email' }, { status: 400 })
    }
    const preferredDate = typeof raw.preferredDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.preferredDate) ? raw.preferredDate : null
    const preferredTime = cleanText(raw.preferredTime, 40) || null

    rateLimit(limitKey, 5, 60 * 60 * 1000)

    const supabase = await createAdminClient()
    const { data: prop } = await supabase.from('properties').select('id, type').eq('id', propertyId).maybeSingle()
    if (!prop) return NextResponse.json({ error: 'That property is no longer listed' }, { status: 404 })

    // Lead and contact first, so the booking is linked from the start
    const attr = attributionFrom(raw, 'inspection')
    let who: Awaited<ReturnType<typeof identify>> = { leadId: null, contact: null, leadCreated: false }
    try {
      who = await identify({ name, email, phone, propertyId, visitorId: cleanText(raw.visitorId, 100) || null }, attr, { contactSource: 'inspection' })
    } catch (err) { console.error('identify failed', err) }
    let assignedTo: string | null = null
    if (who.leadId) assignedTo = (await supabase.from('leads').select('assigned_to').eq('id', who.leadId).maybeSingle()).data?.assigned_to || null

    const { data, error } = await supabase
      .from('viewing_requests')
      .insert({
        name,
        phone,
        email,
        property_id: propertyId,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        visitor_notes: cleanText(raw.message, 500) || null,
        visitor_id: cleanText(raw.visitorId, 100) || null,
        session_id: cleanText(raw.sessionId, 100) || null,
        reference: makeReference('IN'),
        lead_id: who.leadId,
        contact_id: who.contact?.id || null,
        assigned_to: assignedTo,
      })
      .select(`
        *,
        property:properties(id, title, district)
      `)
      .single()

    if (error) {
      console.error('Error creating viewing request:', error)
      return NextResponse.json({ error: 'Failed to submit viewing request' }, { status: 500 })
    }

    try {
      if (who.leadId) {
        await supabase.from('lead_property_interests').upsert({
          lead_id: who.leadId, property_id: propertyId, interest_type: 'viewing_requested', viewing_requested_at: new Date().toISOString(),
        }, { onConflict: 'lead_id,property_id' })
      }
      const payload = { viewing_id: data.id, lead_id: who.leadId, contact_id: who.contact?.id || null, property_id: propertyId, property_type: prop.type, subject_key: `inspection:${data.id}`, vars: { inspection_event: 'requested' } }
      if (who.leadCreated && who.leadId) {
        await emitEvent('lead.created', { ...payload, subject_key: `lead:${who.leadId}` }, `lead.created:${who.leadId}`)
        await recordConversion({ type: 'lead', entityId: who.leadId, contactId: who.contact?.id, leadId: who.leadId, propertyId })
      }
      await emitEvent('inspection.requested', payload, `inspection.requested:${data.id}`)
      await recordConversion({ type: 'inspection', entityId: data.id, contactId: who.contact?.id, leadId: who.leadId, propertyId })
      if (raw.marketingConsent === true && who.contact) await handleMarketingOptIn(who.contact, request, 'inspection_form')
      kickWorker('inspection')
    } catch (err) {
      console.error('Inspection follow-up failed (the scheduled worker will retry):', err)
    }

    return NextResponse.json(transformViewingRequest(data), { status: 201 })

  } catch (err) {
    console.error('Viewing request error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

function transformViewingRequest(row: Record<string, unknown>) {
  return {
    id: row.id,
    leadId: row.lead_id,
    propertyId: row.property_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    status: row.status,
    confirmedDatetime: row.confirmed_datetime,
    visitorNotes: row.visitor_notes,
    agentNotes: row.agent_notes,
    reference: row.reference,
    assignedTo: row.assigned_to,
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    property: row.property,
    lead: row.lead,
  }
}
