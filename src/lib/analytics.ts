'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Event types
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

interface TrackOptions {
  property_id?: string
  property_title?: string
  property_district?: string
  property_type?: string
  property_price?: number
  event_label?: string
  event_value?: number
  duration_seconds?: number
  metadata?: Record<string, unknown>
}

// Generate or get visitor ID (persisted in localStorage)
function getVisitorId(): string {
  if (typeof window === 'undefined') return ''

  let visitorId = localStorage.getItem('sabi_visitor_id')
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('sabi_visitor_id', visitorId)
  }
  return visitorId
}

// Generate session ID (persisted in sessionStorage)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('sabi_session_id')
  if (!sessionId) {
    sessionId = 's_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    sessionStorage.setItem('sabi_session_id', sessionId)
  }
  return sessionId
}

// Get device info
function getDeviceInfo() {
  if (typeof window === 'undefined') return {}

  const ua = navigator.userAgent
  let deviceType = 'desktop'
  if (/tablet|ipad/i.test(ua)) deviceType = 'tablet'
  else if (/mobile|android|iphone/i.test(ua)) deviceType = 'mobile'

  let browser = 'unknown'
  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edge')) browser = 'Edge'

  let os = 'unknown'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS'

  return {
    device_type: deviceType,
    browser,
    os,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
  }
}

// Get UTM parameters
function getUtmParams() {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  }
}

// Core tracking function
export async function track(
  eventType: AnalyticsEventType,
  options: TrackOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') return

  // Don't track in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ANALYTICS_DEV) {
    console.log('[Analytics]', eventType, options)
    return
  }

  try {
    const event = {
      event_type: eventType,
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || undefined,
      ...getDeviceInfo(),
      ...getUtmParams(),
      ...options,
    }

    // Use sendBeacon for better reliability, fallback to fetch
    const payload = JSON.stringify(event)

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', payload)
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {}) // Silently fail
    }
  } catch {
    // Analytics should never break the site
  }
}

// Convenience functions
export const trackPageView = () => track('page_view')

export const trackPropertyView = (property: {
  id: string
  title: string
  district?: string
  type?: string
  price?: number
}) => track('property_view', {
  property_id: property.id,
  property_title: property.title,
  property_district: property.district,
  property_type: property.type,
  property_price: property.price,
})

export const trackInquiry = (property?: { id: string; title: string }) =>
  track('inquiry', property ? {
    property_id: property.id,
    property_title: property.title,
  } : {})

export const trackWhatsAppClick = (property?: { id: string; title: string }) =>
  track('whatsapp_click', property ? {
    property_id: property.id,
    property_title: property.title,
  } : {})

export const trackPhoneClick = (property?: { id: string; title: string }) =>
  track('phone_click', property ? {
    property_id: property.id,
    property_title: property.title,
  } : {})

export const trackEmailClick = () => track('email_click')

export const trackGalleryView = (property: { id: string; title: string }, imageIndex: number) =>
  track('gallery_view', {
    property_id: property.id,
    property_title: property.title,
    event_value: imageIndex,
  })

export const trackMapInteraction = (property?: { id: string; title: string }) =>
  track('map_interaction', property ? {
    property_id: property.id,
    property_title: property.title,
  } : {})

export const trackShareClick = (property: { id: string; title: string }, platform: string) =>
  track('share_click', {
    property_id: property.id,
    property_title: property.title,
    event_label: platform,
  })

export const trackDownloadClick = (documentName: string) =>
  track('download_click', { event_label: documentName })

export const trackFilterUse = (filters: Record<string, unknown>) =>
  track('filter_use', { metadata: filters })

export const trackCtaClick = (ctaName: string, property?: { id: string; title: string }) =>
  track('cta_click', {
    event_label: ctaName,
    property_id: property?.id,
    property_title: property?.title,
  })

// Hook for automatic page view tracking
export function usePageTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastTracked = useRef<string>('')

  useEffect(() => {
    const fullPath = pathname + (searchParams?.toString() ? '?' + searchParams.toString() : '')

    // Avoid duplicate tracking
    if (fullPath === lastTracked.current) return
    lastTracked.current = fullPath

    // Small delay to ensure page title is updated
    const timer = setTimeout(() => {
      trackPageView()
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname, searchParams])
}

// Hook for scroll depth tracking
export function useScrollTracking() {
  const tracked = useRef<Set<number>>(new Set())

  useEffect(() => {
    const checkScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )

      const milestones = [25, 50, 75, 100]
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !tracked.current.has(milestone)) {
          tracked.current.add(milestone)
          track('scroll_depth', { event_value: milestone })
        }
      }
    }

    window.addEventListener('scroll', checkScroll, { passive: true })
    return () => window.removeEventListener('scroll', checkScroll)
  }, [])
}

// Hook for time on page tracking
export function useTimeTracking() {
  const startTime = useRef<number>(Date.now())

  useEffect(() => {
    startTime.current = Date.now()

    const trackTimeOnPage = () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      if (duration > 5) { // Only track if > 5 seconds
        track('page_view', { duration_seconds: duration })
      }
    }

    // Track when leaving the page
    window.addEventListener('beforeunload', trackTimeOnPage)
    window.addEventListener('pagehide', trackTimeOnPage)

    return () => {
      window.removeEventListener('beforeunload', trackTimeOnPage)
      window.removeEventListener('pagehide', trackTimeOnPage)
    }
  }, [])
}

// Combined tracking hook
export function useAnalytics() {
  usePageTracking()

  return {
    track,
    trackPropertyView,
    trackInquiry,
    trackWhatsAppClick,
    trackPhoneClick,
    trackEmailClick,
    trackGalleryView,
    trackMapInteraction,
    trackShareClick,
    trackDownloadClick,
    trackFilterUse,
    trackCtaClick,
  }
}
