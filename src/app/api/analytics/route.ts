import { NextRequest, NextResponse } from 'next/server'
import { clientIp, rateLimit, readJson } from '@/lib/rate-limit'
import { decodeHeader } from '@/lib/visit'
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

// The browser tracker sends many event names (see src/lib/analytics.ts). Accept any
// well-formed snake_case name rather than a hand-kept list that silently drops new ones.
const EVENT_NAME = /^[a-z][a-z_]{1,48}$/

// Location from the hosting platform's headers; Vercel URL-encodes city names
function geo(request: NextRequest) {
  const h = request.headers
  return {
    country: h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || null,
    city: decodeHeader(h.get('x-vercel-ip-city') || h.get('cf-ipcity')),
  }
}

// Generous per-visitor ceiling: real browsing never gets near it, scripted floods do
function allowAnalytics(request: NextRequest, count = 1) {
  return rateLimit(`analytics:${clientIp(request)}`, 180, 60 * 1000, count)
}

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.slice(0, max) : undefined
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function metadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const serialized = JSON.stringify(value)
  return serialized.length <= 4000 ? value as Record<string, unknown> : {}
}

function normalizeEvent(event: AnalyticsEvent) {
  if (typeof event.event_type !== 'string' || !EVENT_NAME.test(event.event_type)) return null

  return {
    event_type: event.event_type,
    event_category: text(event.event_category, 80) || categorizeEvent(event.event_type),
    session_id: text(event.session_id, 120),
    visitor_id: text(event.visitor_id, 120),
    page_path: text(event.page_path, 500),
    page_title: text(event.page_title, 300),
    referrer: text(event.referrer, 1000),
    utm_source: text(event.utm_source, 120),
    utm_medium: text(event.utm_medium, 120),
    utm_campaign: text(event.utm_campaign, 180),
    property_id: text(event.property_id, 80) || null,
    property_title: text(event.property_title, 300),
    property_district: text(event.property_district, 120),
    property_type: text(event.property_type, 120),
    property_price: number(event.property_price),
    event_label: text(event.event_label, 300),
    event_value: number(event.event_value),
    metadata: metadata(event.metadata),
    device_type: text(event.device_type, 80),
    browser: text(event.browser, 120),
    os: text(event.os, 120),
    screen_resolution: text(event.screen_resolution, 80),
    duration_seconds: number(event.duration_seconds),
  }
}

// POST /api/analytics - Track an event
export async function POST(request: NextRequest) {
  try {
    const client = db()
    if (!client) {
      // Silently fail if no database - analytics shouldn't break the site
      return NextResponse.json({ success: true })
    }

    if (!allowAnalytics(request)) {
      return NextResponse.json({ success: true })
    }

    const event = await readJson<AnalyticsEvent>(request, 8 * 1024)
    if (event instanceof NextResponse) return event
    const normalized = normalizeEvent(event)

    if (!normalized) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
    }

    // Get geo info from headers (if behind Cloudflare/Vercel)
    const { country, city } = geo(request)

    // Insert the event
    const { error } = await client.from('analytics_events').insert({
      ...normalized,
      country,
      city,
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

    const body = await readJson<{ events?: AnalyticsEvent[] }>(request, 128 * 1024)
    if (body instanceof NextResponse) return body
    const events = body.events

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'events array is required' }, { status: 400 })
    }

    if (!allowAnalytics(request, Math.min(events.length, 50))) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Limit batch size
    const { country, city } = geo(request)
    const batch = events.slice(0, 50).map(normalizeEvent).filter(Boolean).map(e => ({ ...e, country, city }))

    if (batch.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

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
