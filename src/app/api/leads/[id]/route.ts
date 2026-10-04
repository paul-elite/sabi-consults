import { cleanText } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

// GET single lead with full details (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = await createAdminClient()

  // Get lead with related data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(`
      *,
      most_viewed_property:properties!leads_most_viewed_property_id_fkey(id, title, district, images, price, type)
    `)
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Get preferences
  const { data: preferences } = await supabase
    .from('lead_preferences')
    .select('*')
    .eq('lead_id', id)
    .single()

  // Get property interests with property details
  const { data: propertyInterests } = await supabase
    .from('lead_property_interests')
    .select(`
      *,
      property:properties(id, title, district, images, price, type, status)
    `)
    .eq('lead_id', id)
    .order('last_viewed_at', { ascending: false })

  // Get recent events (timeline)
  const { data: events } = await supabase
    .from('lead_events')
    .select('*')
    .eq('lead_id', id)
    .order('occurred_at', { ascending: false })
    .limit(100)

  // Get viewing requests
  const { data: viewingRequests } = await supabase
    .from('viewing_requests')
    .select(`
      *,
      property:properties(id, title, district, images)
    `)
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    ...transformLead(lead),
    preferences: preferences ? transformPreferences(preferences) : null,
    propertyInterests: (propertyInterests || []).map(transformPropertyInterest),
    events: (events || []).map(transformEvent),
    viewingRequests: (viewingRequests || []).map(transformViewingRequest),
  })
}

// PUT update lead (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const raw = await request.json()
  const supabase = await createAdminClient()

  // Build update object
  const updates: Record<string, unknown> = {}

  if (raw.status) updates.status = raw.status
  if (raw.quality) updates.quality = raw.quality
  if (raw.notes !== undefined) updates.notes = cleanText(raw.notes, 5000)
  if (raw.assignedTo !== undefined) updates.assigned_to = raw.assignedTo || null

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }

  // Update preferences if provided
  if (raw.preferences) {
    await supabase
      .from('lead_preferences')
      .upsert({
        lead_id: id,
        intent: raw.preferences.intent || null,
        property_types: raw.preferences.propertyTypes || [],
        preferred_districts: raw.preferences.preferredDistricts || [],
        min_bedrooms: raw.preferences.minBedrooms || null,
        max_bedrooms: raw.preferences.maxBedrooms || null,
        min_budget: raw.preferences.minBudget || null,
        max_budget: raw.preferences.maxBudget || null,
        timeline: raw.preferences.timeline || null,
        notes: raw.preferences.notes || null,
      }, { onConflict: 'lead_id' })
  }

  return NextResponse.json(transformLead(data))
}

// DELETE lead (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function transformLead(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    source: row.source,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    referrer: row.referrer,
    landingPage: row.landing_page,
    deviceType: row.device_type,
    browser: row.browser,
    country: row.country,
    city: row.city,
    score: row.score,
    scoreBreakdown: row.score_breakdown,
    quality: row.quality,
    totalVisits: row.total_visits,
    totalSessions: row.total_sessions,
    totalPageViews: row.total_page_views,
    totalPropertyViews: row.total_property_views,
    propertiesViewed: row.properties_viewed,
    mostViewedPropertyId: row.most_viewed_property_id,
    mostViewedProperty: row.most_viewed_property,
    totalContactClicks: row.total_contact_clicks,
    savedProperties: row.saved_properties,
    firstVisitAt: row.first_visit_at,
    lastVisitAt: row.last_visit_at,
    firstContactAt: row.first_contact_at,
    lastActivityAt: row.last_activity_at,
    status: row.status,
    assignedTo: row.assigned_to,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function transformPreferences(row: Record<string, unknown>) {
  return {
    id: row.id,
    leadId: row.lead_id,
    intent: row.intent,
    propertyTypes: row.property_types,
    preferredDistricts: row.preferred_districts,
    minBedrooms: row.min_bedrooms,
    maxBedrooms: row.max_bedrooms,
    minBudget: row.min_budget,
    maxBudget: row.max_budget,
    landSizeMin: row.land_size_min,
    landSizeMax: row.land_size_max,
    requiredFeatures: row.required_features,
    timeline: row.timeline,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function transformPropertyInterest(row: Record<string, unknown>) {
  return {
    id: row.id,
    leadId: row.lead_id,
    propertyId: row.property_id,
    interestType: row.interest_type,
    viewCount: row.view_count,
    totalTimeSeconds: row.total_time_seconds,
    galleryViews: row.gallery_views,
    mapInteractions: row.map_interactions,
    firstViewedAt: row.first_viewed_at,
    lastViewedAt: row.last_viewed_at,
    inquiredAt: row.inquired_at,
    viewingRequestedAt: row.viewing_requested_at,
    property: row.property,
  }
}

function transformEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    leadId: row.lead_id,
    eventType: row.event_type,
    eventLabel: row.event_label,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    pagePath: row.page_path,
    metadata: row.metadata,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    property: row.property,
  }
}
