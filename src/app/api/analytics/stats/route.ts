import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient as db } from '@/lib/auth'

// GET /api/analytics/stats - Get analytics dashboard data
export async function GET(request: NextRequest) {
  // Require admin authentication
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

  const client = db()
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const searchParams = request.nextUrl.searchParams
  const range = searchParams.get('range') || '7d' // 7d, 30d, 90d, all
  const propertyId = searchParams.get('property_id')

  // Calculate date range
  const now = new Date()
  let startDate: Date
  switch (range) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date('2020-01-01')
  }

  try {
    // Build base query
    let query = client
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Analytics fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Calculate metrics
    const stats = calculateStats(events || [], startDate)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Analytics stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

interface AnalyticsEvent {
  id: string
  event_type: string
  event_category: string | null
  session_id: string | null
  visitor_id: string | null
  page_path: string | null
  referrer: string | null
  property_id: string | null
  property_title: string | null
  property_district: string | null
  property_type: string | null
  event_label: string | null
  device_type: string | null
  country: string | null
  city: string | null
  duration_seconds: number | null
  created_at: string
}

function calculateStats(events: AnalyticsEvent[], startDate: Date) {
  const pageViews = events.filter(e => e.event_type === 'page_view')
  const propertyViews = events.filter(e => e.event_type === 'property_view')
  const inquiries = events.filter(e => e.event_type === 'inquiry')
  const clicks = events.filter(e => ['whatsapp_click', 'phone_click', 'email_click'].includes(e.event_type))

  // Unique visitors and sessions
  const uniqueVisitors = new Set(events.map(e => e.visitor_id).filter(Boolean)).size
  const uniqueSessions = new Set(events.map(e => e.session_id).filter(Boolean)).size

  // Traffic sources
  const sources: Record<string, number> = {}
  pageViews.forEach(e => {
    const source = parseSource(e.referrer)
    sources[source] = (sources[source] || 0) + 1
  })

  // Device breakdown
  const devices: Record<string, number> = {}
  events.forEach(e => {
    if (e.device_type) {
      devices[e.device_type] = (devices[e.device_type] || 0) + 1
    }
  })

  // Top pages
  const pageCounts: Record<string, number> = {}
  pageViews.forEach(e => {
    if (e.page_path) {
      pageCounts[e.page_path] = (pageCounts[e.page_path] || 0) + 1
    }
  })
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }))

  // Top properties
  const propertyCounts: Record<string, { id: string; title: string; district: string; views: number }> = {}
  propertyViews.forEach(e => {
    if (e.property_id) {
      if (!propertyCounts[e.property_id]) {
        propertyCounts[e.property_id] = {
          id: e.property_id,
          title: e.property_title || 'Unknown',
          district: e.property_district || 'Unknown',
          views: 0,
        }
      }
      propertyCounts[e.property_id].views++
    }
  })
  const topProperties = Object.values(propertyCounts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // Top districts
  const districtCounts: Record<string, number> = {}
  propertyViews.forEach(e => {
    if (e.property_district) {
      districtCounts[e.property_district] = (districtCounts[e.property_district] || 0) + 1
    }
  })
  const topDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, views]) => ({ name, views }))

  // Geographic distribution
  const countries: Record<string, number> = {}
  events.forEach(e => {
    if (e.country) {
      countries[e.country] = (countries[e.country] || 0) + 1
    }
  })
  const topCountries = Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))

  // Daily trend
  const dailyData: Record<string, { views: number; visitors: Set<string>; inquiries: number }> = {}
  events.forEach(e => {
    const date = e.created_at.split('T')[0]
    if (!dailyData[date]) {
      dailyData[date] = { views: 0, visitors: new Set(), inquiries: 0 }
    }
    if (e.event_type === 'page_view') dailyData[date].views++
    if (e.visitor_id) dailyData[date].visitors.add(e.visitor_id)
    if (e.event_type === 'inquiry') dailyData[date].inquiries++
  })

  const trend = Object.entries(dailyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      views: data.views,
      visitors: data.visitors.size,
      inquiries: data.inquiries,
    }))

  // Conversion funnel
  const funnelStages = {
    visitors: uniqueVisitors,
    propertyViews: new Set(propertyViews.map(e => e.visitor_id).filter(Boolean)).size,
    contactClicks: new Set(clicks.map(e => e.visitor_id).filter(Boolean)).size,
    inquiries: new Set(inquiries.map(e => e.visitor_id).filter(Boolean)).size,
  }

  // Contact method breakdown
  const contactMethods = {
    whatsapp: events.filter(e => e.event_type === 'whatsapp_click').length,
    phone: events.filter(e => e.event_type === 'phone_click').length,
    email: events.filter(e => e.event_type === 'email_click').length,
    form: inquiries.length,
  }

  // Average session duration (from events with duration)
  const durations = events.filter(e => e.duration_seconds && e.duration_seconds > 0)
  const avgSessionDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / durations.length)
    : 0

  return {
    summary: {
      pageViews: pageViews.length,
      uniqueVisitors,
      uniqueSessions,
      propertyViews: propertyViews.length,
      totalInquiries: inquiries.length,
      totalContactClicks: clicks.length,
      avgSessionDuration,
      conversionRate: uniqueVisitors > 0
        ? ((inquiries.length / uniqueVisitors) * 100).toFixed(2)
        : '0',
    },
    trafficSources: sources,
    deviceBreakdown: devices,
    topPages,
    topProperties,
    topDistricts,
    topCountries,
    trend,
    funnel: funnelStages,
    contactMethods,
    dateRange: {
      start: startDate.toISOString(),
      end: new Date().toISOString(),
    },
  }
}

function parseSource(referrer: string | null): string {
  if (!referrer) return 'Direct'

  const url = referrer.toLowerCase()
  if (url.includes('google')) return 'Google'
  if (url.includes('facebook') || url.includes('fb.')) return 'Facebook'
  if (url.includes('instagram')) return 'Instagram'
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter/X'
  if (url.includes('linkedin')) return 'LinkedIn'
  if (url.includes('whatsapp')) return 'WhatsApp'
  if (url.includes('youtube')) return 'YouTube'
  if (url.includes('tiktok')) return 'TikTok'

  try {
    const domain = new URL(referrer).hostname.replace('www.', '')
    return domain
  } catch {
    return 'Other'
  }
}
