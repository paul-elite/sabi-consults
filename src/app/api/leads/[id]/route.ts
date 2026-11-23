import { cleanText } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireRole, type SessionUser } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { isUuid } from '@/lib/email/config'
import { LEAD_STATUSES } from '@/lib/email/defaults'
import { emitEvent } from '@/lib/email/events'
import { kickWorker } from '@/lib/email/worker'

/** Admins can open any lead; agents (staff) only the leads assigned to them. */
async function canOpen(id: string, user: SessionUser) {
  if (user.role !== 'staff') return true
  const supabase = await createAdminClient()
  const { data } = await supabase.from('leads').select('assigned_to').eq('id', id).maybeSingle()
  return !!data && data.assigned_to === user.id
}

// GET single lead with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!(await canOpen(id, auth))) return NextResponse.json({ error: 'This lead isn’t assigned to you' }, { status: 403 })
  const supabase = await createAdminClient()

  // Get lead with related data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(`
      *,
      most_viewed_property:properties!leads_most_viewed_property_id_fkey(id, title, district, images, price, type),
      assignee:admin_users!leads_assigned_to_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const [preferences, propertyInterests, events, viewingRequests, contact, inquiries, transactions, emails, activities, runs] = await Promise.all([
    supabase.from('lead_preferences').select('*').eq('lead_id', id).maybeSingle(),
    supabase.from('lead_property_interests').select('*, property:properties(id, title, district, images, price, type, status)').eq('lead_id', id).order('last_viewed_at', { ascending: false }),
    supabase.from('lead_events').select('*').eq('lead_id', id).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('viewing_requests').select('*, property:properties(id, title, district, images)').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('contacts').select('id, email, marketing_status, followups_opt_out, suppressed, suppression_reason, frequency, tags, kind, consent_at, consent_source, unsubscribed_at').eq('lead_id', id).limit(1).maybeSingle(),
    supabase.from('inquiries').select('id, reference, enquiry_type, message, budget, preferred_location, created_at, property:properties(id, title)').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('transactions').select('*, property:properties(id, title)').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('email_messages').select('id, to_email, category, template_key, subject, status, status_reason, send_after, sent_at, opened_at, clicked_at, created_at').eq('lead_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('automation_runs').select('id, status, step_index, next_run_at, exit_reason, started_at, automation:automations(id, name, steps)').eq('lead_id', id).order('started_at', { ascending: false }).limit(30),
  ])

  // Emails to the contact that weren't tagged with the lead (e.g. newsletters)
  let allEmails = emails.data || []
  if (contact.data) {
    const { data: extra } = await supabase.from('email_messages').select('id, to_email, category, template_key, subject, status, status_reason, send_after, sent_at, opened_at, clicked_at, created_at')
      .eq('contact_id', contact.data.id).is('lead_id', null).order('created_at', { ascending: false }).limit(50)
    allEmails = [...allEmails, ...(extra || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  return NextResponse.json({
    ...transformLead(lead),
    assignee: lead.assignee || null,
    preferences: preferences.data ? transformPreferences(preferences.data) : null,
    propertyInterests: (propertyInterests.data || []).map(transformPropertyInterest),
    events: (events.data || []).map(transformEvent),
    viewingRequests: (viewingRequests.data || []).map(transformViewingRequest),
    contact: contact.data || null,
    inquiries: inquiries.data || [],
    transactions: transactions.data || [],
    emails: allEmails,
    activities: activities.data || [],
    automationRuns: runs.data || [],
  })
}

// PUT update lead: status, assignment, notes, follow-up date, "replied"
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!(await canOpen(id, auth))) return NextResponse.json({ error: 'This lead isn’t assigned to you' }, { status: 403 })
  const raw = await readJson(request, 32 * 1024)
  if (raw instanceof NextResponse) return raw
  const supabase = await createAdminClient()
  const { data: before } = await supabase.from('leads').select('status, assigned_to, notes').eq('id', id).maybeSingle()
  if (!before) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const actor = { actor_id: auth.id === 'env' ? null : auth.id, actor_name: auth.name }
  const updates: Record<string, unknown> = {}
  const now = new Date().toISOString()

  if (typeof raw.status === 'string' && raw.status !== before.status) {
    if (!LEAD_STATUSES.some(s => s.value === raw.status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
    updates.status = raw.status
    if (raw.status !== 'new') updates.last_contacted_at = now
  }
  if (raw.quality && ['cold', 'warm', 'hot'].includes(String(raw.quality))) updates.quality = raw.quality
  if (raw.notes !== undefined) updates.notes = cleanText(raw.notes, 5000)
  if (raw.nextFollowUpAt !== undefined) {
    const d = raw.nextFollowUpAt ? new Date(String(raw.nextFollowUpAt)) : null
    if (d && isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid follow-up date' }, { status: 400 })
    updates.next_follow_up_at = d ? d.toISOString() : null
  }
  if (raw.kind && ['buyer', 'owner', 'landowner', 'developer', 'corporate', 'partner', 'other'].includes(String(raw.kind))) updates.kind = raw.kind
  let assignedChanged = false
  if (raw.assignedTo !== undefined && (raw.assignedTo || null) !== before.assigned_to) {
    // Only admins assign or reassign leads
    if (auth.role === 'staff') return NextResponse.json({ error: 'Only an admin can reassign leads' }, { status: 403 })
    const to = raw.assignedTo ? String(raw.assignedTo) : null
    if (to) {
      const { data: agent } = await supabase.from('admin_users').select('id').eq('id', to).eq('active', true).maybeSingle()
      if (!agent) return NextResponse.json({ error: 'That staff account doesn’t exist or is inactive' }, { status: 400 })
    }
    updates.assigned_to = to
    updates.assigned_at = to ? now : null
    assignedChanged = true
  }

  const { data, error } = Object.keys(updates).length
    ? await supabase.from('leads').update(updates).eq('id', id).select().single()
    : await supabase.from('leads').select().eq('id', id).single()

  if (error || !data) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }

  const { data: contact } = await supabase.from('contacts').select('id').eq('lead_id', id).limit(1).maybeSingle()
  const base = { lead_id: id, contact_id: contact?.id || null }
  if (updates.status) {
    await supabase.from('lead_activities').insert({ lead_id: id, type: 'status_change', from_value: before.status, to_value: updates.status as string, ...actor })
    await emitEvent('lead.status_changed', { ...base, from: before.status, to: updates.status, subject_key: `status:${id}:${updates.status}` }, `lead.status_changed:${id}:${updates.status}:${now}`)
  }
  if (assignedChanged) {
    await supabase.from('lead_activities').insert({ lead_id: id, type: 'assignment', from_value: before.assigned_to, to_value: (updates.assigned_to as string) || null, ...actor })
    if (updates.assigned_to) {
      await emitEvent('lead.assigned', { ...base, agent_id: updates.assigned_to, subject_key: `assigned:${id}:${updates.assigned_to}` }, `lead.assigned:${id}:${updates.assigned_to}:${now}`)
      // Open inspections follow the lead to the new agent unless one is set
      await supabase.from('viewing_requests').update({ assigned_to: updates.assigned_to }).eq('lead_id', id).is('assigned_to', null).in('status', ['pending', 'confirmed'])
    }
  }
  if (raw.replied === true) {
    await supabase.from('leads').update({ last_contacted_at: now }).eq('id', id)
    await supabase.from('lead_activities').insert({ lead_id: id, type: 'replied', ...actor })
    await emitEvent('lead.replied', { ...base, subject_key: `replied:${id}` }, `lead.replied:${id}:${now}`)
  }
  if (updates.next_follow_up_at !== undefined) {
    await supabase.from('lead_activities').insert({ lead_id: id, type: 'follow_up_set', to_value: (updates.next_follow_up_at as string) || null, ...actor })
  }
  if (typeof raw.note === 'string' && raw.note.trim()) {
    await supabase.from('lead_activities').insert({ lead_id: id, type: 'note', to_value: cleanText(raw.note, 2000), ...actor })
  }

  // Update preferences if provided
  if (raw.preferences && typeof raw.preferences === 'object') {
    const p = raw.preferences as Record<string, unknown>
    await supabase
      .from('lead_preferences')
      .upsert({
        lead_id: id,
        intent: p.intent || null,
        property_types: p.propertyTypes || [],
        preferred_districts: p.preferredDistricts || [],
        min_bedrooms: p.minBedrooms || null,
        max_bedrooms: p.maxBedrooms || null,
        min_budget: p.minBudget || null,
        max_budget: p.maxBudget || null,
        timeline: p.timeline || null,
        notes: p.notes || null,
      }, { onConflict: 'lead_id' })
  }
  kickWorker('lead-update')

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
    kind: row.kind,
    nextFollowUpAt: row.next_follow_up_at,
    lastContactedAt: row.last_contacted_at,
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
    reference: row.reference,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    property: row.property,
  }
}
