'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Extended event types for comprehensive real-estate tracking
export type AnalyticsEventType =
  // Navigation
  | 'page_view'
  | 'page_exit'
  // Property engagement
  | 'property_view'
  | 'property_view_duration'
  | 'gallery_open'
  | 'gallery_image_view'
  | 'gallery_complete'
  | 'map_open'
  | 'map_interaction'
  | 'amenities_view'
  | 'description_expand'
  | 'floorplan_view'
  | 'video_play'
  | 'video_complete'
  | 'similar_property_click'
  // Save/bookmark
  | 'save_property'
  | 'unsave_property'
  // Search & filtering
  | 'search'
  | 'filter_applied'
  | 'sort_changed'
  // Contact actions
  | 'whatsapp_click'
  | 'phone_click'
  | 'email_click'
  | 'inquiry_started'
  | 'inquiry_submitted'
  // Viewing requests
  | 'viewing_requested'
  // Sharing
  | 'share_click'
  | 'download_click'
  // Lead capture popups
  | 'popup_view'
  | 'popup_dismissed'
  | 'popup_started'
  | 'popup_submitted'
  // Engagement signals
  | 'scroll_depth'
  | 'cta_click'
  | 'outbound_click'
  | 'agent_profile_view'

interface PropertyContext {
  id: string
  title?: string
  district?: string
  type?: string
  price?: number
  purpose?: 'sale' | 'rent'
}

interface TrackOptions {
  // Property context
  property?: PropertyContext
  property_id?: string
  property_title?: string
  property_district?: string
  property_type?: string
  property_price?: number
  property_purpose?: string
  // Event details
  event_label?: string
  event_value?: number
  duration_seconds?: number
  // Search/filter context
  search_query?: string
  filters?: Record<string, unknown>
  sort_by?: string
  // Page context
  previous_page?: string
  // Engagement metrics
  scroll_percent?: number
  image_index?: number
  gallery_total?: number
  // Popup context
  popup_type?: string
  // Flexible metadata
  metadata?: Record<string, unknown>
}

// Visitor identification (persisted in localStorage)
function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let visitorId = localStorage.getItem('sabi_visitor_id')
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('sabi_visitor_id', visitorId)
  }
  return visitorId
}

// Session identification (persisted in sessionStorage)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = sessionStorage.getItem('sabi_session_id')
  if (!sessionId) {
    sessionId = 's_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    sessionStorage.setItem('sabi_session_id', sessionId)
  }
  return sessionId
}

// Get visit count
function getVisitCount(): number {
  if (typeof window === 'undefined') return 1
  const count = parseInt(localStorage.getItem('sabi_visit_count') || '0', 10) + 1
  localStorage.setItem('sabi_visit_count', count.toString())
  return count
}

// Check if returning visitor
function isReturningVisitor(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('sabi_visitor_id') !== null
}

// Get first visit timestamp
function getFirstVisit(): string | undefined {
  if (typeof window === 'undefined') return undefined
  let firstVisit = localStorage.getItem('sabi_first_visit')
  if (!firstVisit) {
    firstVisit = new Date().toISOString()
    localStorage.setItem('sabi_first_visit', firstVisit)
  }
  return firstVisit
}

// Device detection
function getDeviceInfo() {
  if (typeof window === 'undefined') return {}

  const ua = navigator.userAgent
  let deviceType = 'desktop'
  if (/tablet|ipad/i.test(ua)) deviceType = 'tablet'
  else if (/mobile|android|iphone/i.test(ua)) deviceType = 'mobile'

  let browser = 'unknown'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edg')) browser = 'Edge'

  let os = 'unknown'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'

  return {
    device_type: deviceType,
    browser,
    os,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
  }
}

// UTM parameters
function getUtmParams() {
  if (typeof window === 'undefined') return {}

  // Check URL first, then sessionStorage (for persistence across pages)
  const params = new URLSearchParams(window.location.search)
  const utm = {
    utm_source: params.get('utm_source') || sessionStorage.getItem('sabi_utm_source') || undefined,
    utm_medium: params.get('utm_medium') || sessionStorage.getItem('sabi_utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || sessionStorage.getItem('sabi_utm_campaign') || undefined,
    utm_content: params.get('utm_content') || sessionStorage.getItem('sabi_utm_content') || undefined,
  }

  // Persist UTM params for the session
  if (params.get('utm_source')) sessionStorage.setItem('sabi_utm_source', params.get('utm_source')!)
  if (params.get('utm_medium')) sessionStorage.setItem('sabi_utm_medium', params.get('utm_medium')!)
  if (params.get('utm_campaign')) sessionStorage.setItem('sabi_utm_campaign', params.get('utm_campaign')!)
  if (params.get('utm_content')) sessionStorage.setItem('sabi_utm_content', params.get('utm_content')!)

  return utm
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
    // Build property context from either property object or individual fields
    const propertyContext = options.property ? {
      property_id: options.property.id,
      property_title: options.property.title,
      property_district: options.property.district,
      property_type: options.property.type,
      property_price: options.property.price,
    } : {
      property_id: options.property_id,
      property_title: options.property_title,
      property_district: options.property_district,
      property_type: options.property_type,
      property_price: options.property_price,
    }

    const event = {
      event_type: eventType,
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || undefined,
      ...getDeviceInfo(),
      ...getUtmParams(),
      ...propertyContext,
      event_label: options.event_label,
      event_value: options.event_value,
      duration_seconds: options.duration_seconds,
      metadata: {
        ...options.metadata,
        search_query: options.search_query,
        filters: options.filters,
        sort_by: options.sort_by,
        previous_page: options.previous_page,
        scroll_percent: options.scroll_percent,
        image_index: options.image_index,
        gallery_total: options.gallery_total,
        popup_type: options.popup_type,
        visit_count: getVisitCount(),
        returning_visitor: isReturningVisitor(),
        first_visit: getFirstVisit(),
      },
    }

    // Use sendBeacon for better reliability
    const payload = JSON.stringify(event)

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', payload)
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Analytics should never break the site
  }
}

// ============================================================================
// Convenience tracking functions
// ============================================================================

// Page views
export const trackPageView = (previousPage?: string) =>
  track('page_view', { previous_page: previousPage })

// Property engagement
export const trackPropertyView = (property: PropertyContext) =>
  track('property_view', { property })

export const trackPropertyViewDuration = (property: PropertyContext, durationSeconds: number) =>
  track('property_view_duration', { property, duration_seconds: durationSeconds })

export const trackGalleryOpen = (property: PropertyContext) =>
  track('gallery_open', { property })

export const trackGalleryImageView = (property: PropertyContext, imageIndex: number, totalImages: number) =>
  track('gallery_image_view', {
    property,
    image_index: imageIndex,
    gallery_total: totalImages,
    event_value: imageIndex,
  })

export const trackGalleryComplete = (property: PropertyContext, totalImages: number) =>
  track('gallery_complete', { property, gallery_total: totalImages })

export const trackMapOpen = (property?: PropertyContext) =>
  track('map_open', property ? { property } : {})

export const trackMapInteraction = (property?: PropertyContext, interactionType?: string) =>
  track('map_interaction', {
    property,
    event_label: interactionType,
  })

export const trackAmenitiesView = (property: PropertyContext) =>
  track('amenities_view', { property })

export const trackDescriptionExpand = (property: PropertyContext) =>
  track('description_expand', { property })

export const trackVideoPlay = (property: PropertyContext) =>
  track('video_play', { property })

export const trackVideoComplete = (property: PropertyContext) =>
  track('video_complete', { property })

export const trackSimilarPropertyClick = (fromProperty: PropertyContext, toPropertyId: string) =>
  track('similar_property_click', {
    property: fromProperty,
    event_label: toPropertyId,
  })

// Save/bookmark
export const trackSaveProperty = (property: PropertyContext) =>
  track('save_property', { property })

export const trackUnsaveProperty = (property: PropertyContext) =>
  track('unsave_property', { property })

// Search & filtering
export const trackSearch = (query: string, resultCount?: number) =>
  track('search', {
    search_query: query,
    event_value: resultCount,
  })

export const trackFilterApplied = (filters: Record<string, unknown>) =>
  track('filter_applied', { filters })

export const trackSortChanged = (sortBy: string) =>
  track('sort_changed', { sort_by: sortBy, event_label: sortBy })

// Contact actions
export const trackWhatsAppClick = (property?: PropertyContext) =>
  track('whatsapp_click', property ? { property } : {})

export const trackPhoneClick = (property?: PropertyContext) =>
  track('phone_click', property ? { property } : {})

export const trackEmailClick = (property?: PropertyContext) =>
  track('email_click', property ? { property } : {})

export const trackInquiryStarted = (property?: PropertyContext) =>
  track('inquiry_started', property ? { property } : {})

export const trackInquirySubmitted = (property?: PropertyContext) =>
  track('inquiry_submitted', property ? { property } : {})

export const trackViewingRequested = (property: PropertyContext) =>
  track('viewing_requested', { property })

// Sharing
export const trackShareClick = (property: PropertyContext, platform: string) =>
  track('share_click', { property, event_label: platform })

export const trackDownloadClick = (documentName: string, property?: PropertyContext) =>
  track('download_click', { property, event_label: documentName })

// Lead capture popups
export const trackPopupView = (popupType: string, property?: PropertyContext) =>
  track('popup_view', { popup_type: popupType, property })

export const trackPopupDismissed = (popupType: string, property?: PropertyContext) =>
  track('popup_dismissed', { popup_type: popupType, property })

export const trackPopupStarted = (popupType: string, property?: PropertyContext) =>
  track('popup_started', { popup_type: popupType, property })

export const trackPopupSubmitted = (popupType: string, property?: PropertyContext) =>
  track('popup_submitted', { popup_type: popupType, property })

// Engagement signals
export const trackScrollDepth = (percent: number, property?: PropertyContext) =>
  track('scroll_depth', { scroll_percent: percent, event_value: percent, property })

export const trackCtaClick = (ctaName: string, property?: PropertyContext) =>
  track('cta_click', { event_label: ctaName, property })

export const trackOutboundClick = (url: string) =>
  track('outbound_click', { event_label: url })

export const trackAgentProfileView = (agentId: string) =>
  track('agent_profile_view', { event_label: agentId })

// ============================================================================
// React Hooks for automatic tracking
// ============================================================================

// Automatic page view tracking
export function usePageTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastTracked = useRef<string>('')
  const previousPath = useRef<string>('')

  useEffect(() => {
    const fullPath = pathname + (searchParams?.toString() ? '?' + searchParams.toString() : '')

    if (fullPath === lastTracked.current) return

    const prev = previousPath.current
    previousPath.current = fullPath
    lastTracked.current = fullPath

    // Small delay to ensure page title is updated
    const timer = setTimeout(() => {
      trackPageView(prev || undefined)
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname, searchParams])
}

// Scroll depth tracking
export function useScrollTracking(property?: PropertyContext) {
  const tracked = useRef<Set<number>>(new Set())

  useEffect(() => {
    tracked.current = new Set() // Reset on mount

    const checkScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )

      const milestones = [25, 50, 75, 100]
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !tracked.current.has(milestone)) {
          tracked.current.add(milestone)
          trackScrollDepth(milestone, property)
        }
      }
    }

    window.addEventListener('scroll', checkScroll, { passive: true })
    return () => window.removeEventListener('scroll', checkScroll)
  }, [property?.id])
}

// Time on page tracking
export function useTimeTracking(property?: PropertyContext) {
  const startTime = useRef<number>(Date.now())

  useEffect(() => {
    startTime.current = Date.now()

    const trackTimeOnPage = () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      if (duration >= 5) {
        if (property) {
          trackPropertyViewDuration(property, duration)
        } else {
          track('page_view', { duration_seconds: duration })
        }
      }
    }

    window.addEventListener('beforeunload', trackTimeOnPage)
    window.addEventListener('pagehide', trackTimeOnPage)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') trackTimeOnPage()
    })

    return () => {
      trackTimeOnPage()
      window.removeEventListener('beforeunload', trackTimeOnPage)
      window.removeEventListener('pagehide', trackTimeOnPage)
    }
  }, [property?.id])
}

// Property view tracking (combines view event + time tracking)
export function usePropertyTracking(property: PropertyContext) {
  const tracked = useRef(false)

  useEffect(() => {
    if (!tracked.current) {
      trackPropertyView(property)
      tracked.current = true
    }
  }, [property.id])

  useScrollTracking(property)
  useTimeTracking(property)
}

// Combined analytics hook
export function useAnalytics() {
  usePageTracking()

  return {
    track,
    trackPageView,
    trackPropertyView,
    trackPropertyViewDuration,
    trackGalleryOpen,
    trackGalleryImageView,
    trackGalleryComplete,
    trackMapOpen,
    trackMapInteraction,
    trackAmenitiesView,
    trackDescriptionExpand,
    trackVideoPlay,
    trackVideoComplete,
    trackSimilarPropertyClick,
    trackSaveProperty,
    trackUnsaveProperty,
    trackSearch,
    trackFilterApplied,
    trackSortChanged,
    trackWhatsAppClick,
    trackPhoneClick,
    trackEmailClick,
    trackInquiryStarted,
    trackInquirySubmitted,
    trackViewingRequested,
    trackShareClick,
    trackDownloadClick,
    trackPopupView,
    trackPopupDismissed,
    trackPopupStarted,
    trackPopupSubmitted,
    trackScrollDepth,
    trackCtaClick,
    trackOutboundClick,
    trackAgentProfileView,
  }
}

// ============================================================================
// Visitor identity helpers (for lead capture)
// ============================================================================

export function getVisitorIdentity() {
  return {
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    visitCount: getVisitCount(),
    isReturning: isReturningVisitor(),
    firstVisit: getFirstVisit(),
    ...getUtmParams(),
    ...getDeviceInfo(),
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    landingPage: typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('sabi_landing_page') || window.location.pathname
      : undefined,
  }
}

// Store landing page on first visit
if (typeof window !== 'undefined' && !sessionStorage.getItem('sabi_landing_page')) {
  sessionStorage.setItem('sabi_landing_page', window.location.pathname)
}
