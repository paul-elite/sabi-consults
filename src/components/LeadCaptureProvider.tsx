'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { Property, PopupType, PopupDismissal } from '@/lib/types'
import LeadCaptureModal from './LeadCaptureModal'

// ============================================================================
// Types
// ============================================================================

interface LeadCaptureContextValue {
  // Manual triggers
  showPopup: (variant: PopupType, property?: Property) => void
  hidePopup: () => void
  // State checks
  hasSubmitted: boolean
  isPopupOpen: boolean
  // Auto-trigger controls
  enableAutoTriggers: () => void
  disableAutoTriggers: () => void
  // Property engagement tracking (for trigger logic)
  trackPropertyEngagement: (property: Property, action: EngagementAction) => void
}

type EngagementAction =
  | 'view'
  | 'gallery_view'
  | 'time_spent'
  | 'scroll_depth'
  | 'return_visit'

interface PropertyEngagement {
  viewCount: number
  galleryViews: number
  timeSpent: number
  scrollDepth: number
  lastViewedAt: number
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'sabi_lead_capture'
const DISMISSAL_COOLDOWN = 24 * 60 * 60 * 1000 // 24 hours
const GLOBAL_COOLDOWN = 5 * 60 * 1000 // 5 minutes between any popups

// Trigger thresholds
const TRIGGERS = {
  TIME_ON_PROPERTY: 45, // seconds
  GALLERY_VIEWS: 4, // images viewed
  SCROLL_DEPTH: 75, // percent
  PROPERTY_VIEWS: 3, // properties in session
  RETURN_VISIT_DELAY: 5 * 60 * 1000, // 5 minutes since last view
}

// ============================================================================
// Storage helpers
// ============================================================================

interface StoredState {
  hasSubmitted: boolean
  submittedAt?: string
  dismissals: PopupDismissal[]
  lastPopupAt?: string
  propertyEngagements: Record<string, PropertyEngagement>
  sessionPropertyViews: number
}

function getStoredState(): StoredState {
  if (typeof window === 'undefined') {
    return { hasSubmitted: false, dismissals: [], propertyEngagements: {}, sessionPropertyViews: 0 }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {}
  return { hasSubmitted: false, dismissals: [], propertyEngagements: {}, sessionPropertyViews: 0 }
}

function setStoredState(state: Partial<StoredState>) {
  if (typeof window === 'undefined') return
  try {
    const current = getStoredState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }))
  } catch {}
}

// ============================================================================
// Context
// ============================================================================

const LeadCaptureContext = createContext<LeadCaptureContextValue | null>(null)

export function useLeadCapture() {
  const context = useContext(LeadCaptureContext)
  if (!context) {
    throw new Error('useLeadCapture must be used within LeadCaptureProvider')
  }
  return context
}

// ============================================================================
// Provider
// ============================================================================

interface LeadCaptureProviderProps {
  children: ReactNode
}

export function LeadCaptureProvider({ children }: LeadCaptureProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [variant, setVariant] = useState<PopupType>('property_interest')
  const [property, setProperty] = useState<Property | undefined>()
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [autoTriggersEnabled, setAutoTriggersEnabled] = useState(true)

  const engagementRef = useRef<Record<string, PropertyEngagement>>({})
  const sessionPropertyViews = useRef(0)
  const lastPopupTime = useRef(0)

  // Load stored state on mount
  useEffect(() => {
    const stored = getStoredState()
    setHasSubmitted(stored.hasSubmitted)
    engagementRef.current = stored.propertyEngagements || {}
    sessionPropertyViews.current = stored.sessionPropertyViews || 0
    if (stored.lastPopupAt) {
      lastPopupTime.current = new Date(stored.lastPopupAt).getTime()
    }
  }, [])

  // Check if popup was recently dismissed
  const wasDismissed = useCallback((popupType: PopupType, propertyId?: string): boolean => {
    const stored = getStoredState()
    const now = Date.now()

    return stored.dismissals.some(d => {
      const dismissedAt = new Date(d.dismissedAt).getTime()
      const isExpired = now - dismissedAt > DISMISSAL_COOLDOWN

      if (isExpired) return false

      // Same popup type
      if (d.popupType !== popupType) return false

      // If property-specific, check property ID
      if (propertyId && d.propertyId && d.propertyId !== propertyId) return false

      return true
    })
  }, [])

  // Record dismissal
  const recordDismissal = useCallback((popupType: PopupType, propertyId?: string) => {
    const stored = getStoredState()
    const now = Date.now()

    // Clean up old dismissals
    const activeDismissals = stored.dismissals.filter(d => {
      const dismissedAt = new Date(d.dismissedAt).getTime()
      return now - dismissedAt < DISMISSAL_COOLDOWN
    })

    // Add new dismissal
    activeDismissals.push({
      popupType,
      propertyId,
      dismissedAt: new Date().toISOString(),
    })

    setStoredState({ dismissals: activeDismissals })
  }, [])

  // Show popup
  const showPopup = useCallback((v: PopupType, p?: Property) => {
    // Don't show if user already submitted
    if (hasSubmitted) return

    // Don't show if recently dismissed
    if (wasDismissed(v, p?.id)) return

    // Don't show if another popup was shown recently
    const now = Date.now()
    if (now - lastPopupTime.current < GLOBAL_COOLDOWN) return

    setVariant(v)
    setProperty(p)
    setIsOpen(true)
    lastPopupTime.current = now
    setStoredState({ lastPopupAt: new Date().toISOString() })
  }, [hasSubmitted, wasDismissed])

  // Hide popup
  const hidePopup = useCallback(() => {
    if (isOpen) {
      recordDismissal(variant, property?.id)
    }
    setIsOpen(false)
  }, [isOpen, variant, property, recordDismissal])

  // Handle successful submission
  const handleSuccess = useCallback(() => {
    setHasSubmitted(true)
    setStoredState({ hasSubmitted: true, submittedAt: new Date().toISOString() })
  }, [])

  // Track property engagement (for auto-triggers)
  const trackPropertyEngagement = useCallback((prop: Property, action: EngagementAction) => {
    if (!autoTriggersEnabled || hasSubmitted) return

    const engagement = engagementRef.current[prop.id] || {
      viewCount: 0,
      galleryViews: 0,
      timeSpent: 0,
      scrollDepth: 0,
      lastViewedAt: 0,
    }

    const now = Date.now()

    switch (action) {
      case 'view':
        // Check for return visit
        if (engagement.viewCount > 0 && now - engagement.lastViewedAt > TRIGGERS.RETURN_VISIT_DELAY) {
          // This is a return visit - high intent signal
          showPopup('property_interest', prop)
        }
        engagement.viewCount++
        engagement.lastViewedAt = now
        sessionPropertyViews.current++

        // Multiple properties viewed in session
        if (sessionPropertyViews.current >= TRIGGERS.PROPERTY_VIEWS) {
          showPopup('property_match', prop)
        }
        break

      case 'gallery_view':
        engagement.galleryViews++
        if (engagement.galleryViews >= TRIGGERS.GALLERY_VIEWS) {
          showPopup('request_details', prop)
        }
        break

      case 'time_spent':
        engagement.timeSpent++
        if (engagement.timeSpent >= TRIGGERS.TIME_ON_PROPERTY) {
          showPopup('property_interest', prop)
        }
        break

      case 'scroll_depth':
        engagement.scrollDepth = Math.max(engagement.scrollDepth, 100)
        if (engagement.scrollDepth >= TRIGGERS.SCROLL_DEPTH && engagement.timeSpent > 20) {
          showPopup('schedule_viewing', prop)
        }
        break
    }

    engagementRef.current[prop.id] = engagement
    setStoredState({ propertyEngagements: engagementRef.current })
  }, [autoTriggersEnabled, hasSubmitted, showPopup])

  // Enable/disable auto triggers
  const enableAutoTriggers = useCallback(() => setAutoTriggersEnabled(true), [])
  const disableAutoTriggers = useCallback(() => setAutoTriggersEnabled(false), [])

  // Exit intent detection
  useEffect(() => {
    if (!autoTriggersEnabled || hasSubmitted) return

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from top of page
      if (e.clientY > 50) return
      if (isOpen) return

      // Only show exit intent if user has engaged with the page
      if (sessionPropertyViews.current > 0) {
        showPopup('exit_intent')
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [autoTriggersEnabled, hasSubmitted, isOpen, showPopup])

  const value: LeadCaptureContextValue = {
    showPopup,
    hidePopup,
    hasSubmitted,
    isPopupOpen: isOpen,
    enableAutoTriggers,
    disableAutoTriggers,
    trackPropertyEngagement,
  }

  return (
    <LeadCaptureContext.Provider value={value}>
      {children}
      <LeadCaptureModal
        isOpen={isOpen}
        onClose={hidePopup}
        variant={variant}
        property={property}
        onSuccess={handleSuccess}
      />
    </LeadCaptureContext.Provider>
  )
}
