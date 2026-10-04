import { cleanText } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession, sameOrigin } from '@/lib/auth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Rate limiting: 5 requests per hour per IP
const recent = new Map<string, number[]>()

// GET all viewing requests (admin only)
export async function GET(request: NextRequest) {
  const currentUser = await getSession()
  if (!currentUser || !(await sameOrigin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    const raw = await request.json()

    // Honeypot
    if (raw.website) return NextResponse.json({ success: true }, { status: 201 })

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    const now = Date.now()
    const hits = (recent.get(ip) || []).filter(t => now - t < 60 * 60 * 1000)
    if (hits.length >= 5) {
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

    const propertyId = raw.propertyId
    if (!propertyId || !UUID.test(propertyId)) {
      return NextResponse.json({ error: 'Property is required' }, { status: 400 })
    }

    const email = raw.email ? cleanText(raw.email, 200).toLowerCase() : null

    hits.push(now)
    recent.set(ip, hits)

    const supabase = await createAdminClient()

    // Create viewing request
    const { data, error } = await supabase
      .from('viewing_requests')
      .insert({
        name,
        phone,
        email,
        property_id: propertyId,
        preferred_date: raw.preferredDate || null,
        preferred_time: raw.preferredTime || null,
        visitor_notes: cleanText(raw.message, 500) || null,
        visitor_id: cleanText(raw.visitorId, 100) || null,
        session_id: cleanText(raw.sessionId, 100) || null,
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

    // Try to find or create a lead
    let leadId: string | null = null

    // Check for existing lead by phone
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingLead) {
      leadId = existingLead.id
    } else {
      // Create new lead
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          name,
          phone,
          email,
          visitor_id: cleanText(raw.visitorId, 100) || null,
          session_id: cleanText(raw.sessionId, 100) || null,
          source: 'viewing_request',
          most_viewed_property_id: propertyId,
        })
        .select('id')
        .single()

      if (newLead) {
        leadId = newLead.id

        // Link visitor history
        if (raw.visitorId) {
          try {
            await supabase.rpc('link_visitor_to_lead', {
              p_lead_id: leadId,
              p_visitor_id: raw.visitorId,
            })
          } catch { /* Silent fail */ }

          // Calculate score
          try {
            await supabase.rpc('calculate_lead_score', {
              p_lead_id: leadId,
            })
          } catch { /* Silent fail */ }
        }
      }
    }

    // Update viewing request with lead ID
    if (leadId) {
      await supabase
        .from('viewing_requests')
        .update({ lead_id: leadId })
        .eq('id', data.id)

      // Update lead property interest
      await supabase
        .from('lead_property_interests')
        .upsert({
          lead_id: leadId,
          property_id: propertyId,
          interest_type: 'viewing_requested',
          viewing_requested_at: new Date().toISOString(),
        }, { onConflict: 'lead_id,property_id' })

      // Recalculate lead score (viewing request is high value)
      try {
        await supabase.rpc('calculate_lead_score', {
          p_lead_id: leadId,
        })
      } catch { /* Silent fail */ }
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
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    property: row.property,
    lead: row.lead,
  }
}
