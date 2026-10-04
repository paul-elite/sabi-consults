import { cleanText } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i


// GET all leads (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

  const supabase = await createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const quality = searchParams.get('quality')
  const limit = parseInt(searchParams.get('limit') || '100', 10)

  let query = supabase
    .from('leads')
    .select(`
      *,
      most_viewed_property:properties!leads_most_viewed_property_id_fkey(id, title, district, images)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (quality) query = query.eq('quality', quality)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  // Transform to camelCase
  const leads = (data || []).map(transformLead)
  return NextResponse.json(leads)
}

// POST create new lead (public - from lead capture forms)
export async function POST(request: NextRequest) {
  try {
    const raw = await readJson(request, 16 * 1024)
    if (raw instanceof NextResponse) return raw

    // Honeypot field
    if (raw.website) return NextResponse.json({ success: true }, { status: 201 })

    // Rate limiting
    const limitKey = `lead:${clientIp(request)}`
    if (isLimited(limitKey, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    // Validate required fields
    const name = cleanText(raw.name, 120)
    if (!name) {
      return NextResponse.json({ error: 'Name is required', field: 'name' }, { status: 400 })
    }

    const phone = cleanText(raw.phone || raw.whatsapp, 40)
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Valid phone number is required', field: 'phone' }, { status: 400 })
    }

    // Optional fields
    const email = raw.email ? cleanText(raw.email, 200).toLowerCase() : null
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address', field: 'email' }, { status: 400 })
    }

    const whatsapp = raw.whatsapp ? cleanText(raw.whatsapp, 40) : null

    // Get geo info from headers
    const country = request.headers.get('cf-ipcountry') ||
      request.headers.get('x-vercel-ip-country') || null
    const city = request.headers.get('cf-ipcity') ||
      request.headers.get('x-vercel-ip-city') || null

    // Build lead object
    const leadData = {
      name,
      phone,
      email,
      whatsapp: whatsapp || phone,
      visitor_id: cleanText(raw.visitorId, 100) || null,
      session_id: cleanText(raw.sessionId, 100) || null,
      source: parseSource(typeof raw.referrer === 'string' ? raw.referrer : null),
      utm_source: cleanText(raw.utmSource, 100) || null,
      utm_medium: cleanText(raw.utmMedium, 100) || null,
      utm_campaign: cleanText(raw.utmCampaign, 200) || null,
      utm_content: cleanText(raw.utmContent, 200) || null,
      referrer: cleanText(raw.referrer, 500) || null,
      landing_page: cleanText(raw.landingPage, 200) || null,
      device_type: cleanText(raw.deviceType, 20) || null,
      browser: cleanText(raw.browser, 50) || null,
      country,
      city,
      most_viewed_property_id: typeof raw.propertyId === 'string' && UUID.test(raw.propertyId) ? raw.propertyId : null,
    }

    rateLimit(limitKey, 10, 60 * 60 * 1000)

    const supabase = await createAdminClient()

    // Check for existing lead with same phone or email
    let existingLead = null
    if (email) {
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('email', email)
        .single()
      existingLead = data
    }
    if (!existingLead && phone) {
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', phone)
        .single()
      existingLead = data
    }

    if (existingLead) {
      // Update existing lead
      const { data, error } = await supabase
        .from('leads')
        .update({
          ...leadData,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating lead:', error)
        return NextResponse.json({ error: 'Failed to save contact info' }, { status: 500 })
      }

      // Link visitor history if visitor_id provided
      if (leadData.visitor_id) {
        try {
          await supabase.rpc('link_visitor_to_lead', {
            p_lead_id: existingLead.id,
            p_visitor_id: leadData.visitor_id,
          })
        } catch { /* Silent fail - function may not exist yet */ }
      }

      return NextResponse.json({
        ...transformLead(data),
        isExisting: true,
      }, { status: 200 })
    }

    // Create new lead
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({ error: 'Failed to save contact info' }, { status: 500 })
    }

    // Link visitor history if visitor_id provided
    if (leadData.visitor_id) {
      try {
        await supabase.rpc('link_visitor_to_lead', {
          p_lead_id: data.id,
          p_visitor_id: leadData.visitor_id,
        })
      } catch { /* Silent fail */ }

      // Calculate initial score
      try {
        await supabase.rpc('calculate_lead_score', {
          p_lead_id: data.id,
        })
      } catch { /* Silent fail */ }
    }

    // Save preferences if provided
    if (raw.intent || raw.propertyTypes || raw.preferredDistricts || raw.minBudget || raw.maxBudget || raw.timeline) {
      await supabase
        .from('lead_preferences')
        .insert({
          lead_id: data.id,
          intent: raw.intent || null,
          property_types: raw.propertyTypes || [],
          preferred_districts: raw.preferredDistricts || [],
          min_budget: raw.minBudget || null,
          max_budget: raw.maxBudget || null,
          timeline: raw.timeline || null,
        })
    }

    // Create property interest if property provided
    if (leadData.most_viewed_property_id) {
      await supabase
        .from('lead_property_interests')
        .insert({
          lead_id: data.id,
          property_id: leadData.most_viewed_property_id,
          interest_type: 'inquired',
          inquired_at: new Date().toISOString(),
        })
    }

    return NextResponse.json({
      ...transformLead(data),
      isExisting: false,
    }, { status: 201 })

  } catch (err) {
    console.error('Lead creation error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
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

function parseSource(referrer: string | null): string {
  if (!referrer) return 'direct'
  const url = referrer.toLowerCase()
  if (url.includes('google')) return 'google'
  if (url.includes('facebook') || url.includes('fb.')) return 'facebook'
  if (url.includes('instagram')) return 'instagram'
  if (url.includes('twitter') || url.includes('x.com')) return 'twitter'
  if (url.includes('linkedin')) return 'linkedin'
  if (url.includes('whatsapp')) return 'whatsapp'
  if (url.includes('youtube')) return 'youtube'
  if (url.includes('tiktok')) return 'tiktok'
  return 'referral'
}
