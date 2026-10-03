import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/auth'

// Event types for type safety
export type AnalyticsEventType =
  | 'page_view'
  | 'property_view'
  | 'property_search'
  | 'inquiry'
  | 'gallery_view'
  | 'map_interaction'
  | 'whatsapp_click'
  | 'phone_click'
  | 'email_click'
  | 'share_click'
  | 'download_click'
  | 'outbound_click'
  | 'scroll_depth'
  | 'filter_use'
  | 'cta_click'

interface AnalyticsEvent {
  event_type: AnalyticsEventType
  event_category?: string
  session_id?: string
  visitor_id?: string
  page_path?: string
  page_title?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  property_id?: string
  property_title?: string
  property_district?: string
  property_type?: string
  property_price?: number
  event_label?: string
  event_value?: number
  metadata?: Record<string, unknown>
  device_type?: string
  browser?: string
  os?: string
  screen_resolution?: string
  duration_seconds?: number
}

// POST /api/analytics - Track an event
export async function POST(request: NextRequest) {
  try {
    const client = db()
    if (!client) {
      // Silently fail if no database - analytics shouldn't break the site
      return NextResponse.json({ success: true })
    }

    const event: AnalyticsEvent = await request.json()

    // Validate required field
    if (!event.event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
    }

    // Get geo info from headers (if behind Cloudflare/Vercel)
    const country = request.headers.get('cf-ipcountry') ||
                   request.headers.get('x-vercel-ip-country') || null
    const city = request.headers.get('cf-ipcity') ||
                request.headers.get('x-vercel-ip-city') || null

    // Insert the event
    const { error } = await client.from('analytics_events').insert({
      event_type: event.event_type,
      event_category: event.event_category || categorizeEvent(event.event_type),
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      page_path: event.page_path,
      page_title: event.page_title,
      referrer: event.referrer,
      utm_source: event.utm_source,
      utm_medium: event.utm_medium,
      utm_campaign: event.utm_campaign,
      property_id: event.property_id || null,
      property_title: event.property_title,
      property_district: event.property_district,
      property_type: event.property_type,
      property_price: event.property_price,
      event_label: event.event_label,
      event_value: event.event_value,
      metadata: event.metadata || {},
      device_type: event.device_type,
      browser: event.browser,
      os: event.os,
      screen_resolution: event.screen_resolution,
      country,
      city,
      duration_seconds: event.duration_seconds,
    })

    if (error) {
      console.error('Analytics insert error:', error)
      // Don't expose error details, just acknowledge
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ success: true }) // Fail silently
  }
}

// Batch tracking for multiple events
export async function PUT(request: NextRequest) {
  try {
    const client = db()
    if (!client) {
      return NextResponse.json({ success: true })
    }

    const { events }: { events: AnalyticsEvent[] } = await request.json()

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'events array is required' }, { status: 400 })
    }

    // Limit batch size
    const batch = events.slice(0, 50).map(event => ({
      event_type: event.event_type,
      event_category: event.event_category || categorizeEvent(event.event_type),
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      page_path: event.page_path,
      page_title: event.page_title,
      referrer: event.referrer,
      property_id: event.property_id || null,
      property_title: event.property_title,
      property_district: event.property_district,
      event_label: event.event_label,
      event_value: event.event_value,
      metadata: event.metadata || {},
      device_type: event.device_type,
      duration_seconds: event.duration_seconds,
    }))

    const { error } = await client.from('analytics_events').insert(batch)

    if (error) {
      console.error('Analytics batch insert error:', error)
    }

    return NextResponse.json({ success: true, count: batch.length })
  } catch (error) {
    console.error('Analytics batch error:', error)
    return NextResponse.json({ success: true })
  }
}

function categorizeEvent(type: AnalyticsEventType): string {
  const categories: Record<AnalyticsEventType, string> = {
    page_view: 'navigation',
    property_view: 'engagement',
    property_search: 'engagement',
    inquiry: 'conversion',
    gallery_view: 'engagement',
    map_interaction: 'engagement',
    whatsapp_click: 'conversion',
    phone_click: 'conversion',
    email_click: 'conversion',
    share_click: 'engagement',
    download_click: 'engagement',
    outbound_click: 'navigation',
    scroll_depth: 'engagement',
    filter_use: 'engagement',
    cta_click: 'conversion',
  }
  return categories[type] || 'other'
}
