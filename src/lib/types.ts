// Core data types for Sabi Consults

export interface PropertyVariation {
  id: string
  name: string // e.g., "3 Bedroom Terrace", "500 sqm Plot"
  price?: number
  bedrooms?: number
  bathrooms?: number
  bq?: number
  landSize?: number // in sqm
  unitsAvailable?: number
  status?: 'available' | 'sold' | 'pending'
}

export interface Property {
  id: string
  title: string
  description: string
  price: number
  priceLabel?: string // e.g., "Per Plot" for land
  type: 'land' | 'house'
  district: string
  address: string
  latitude: number
  longitude: number
  bedrooms?: number
  bathrooms?: number
  bq?: number // Boys Quarters count
  landSize?: number // in sqm
  images: string[]
  features: string[]
  variations?: PropertyVariation[] // Multiple unit types or plot sizes
  status: 'available' | 'sold' | 'pending'
  featured: boolean
  createdAt: string
  updatedAt: string
}

export interface District {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
}

export interface Testimonial {
  id: string
  name: string
  role: string
  content: string
  image?: string
}

export interface ContactInquiry {
  id: string
  name: string
  email: string
  phone: string
  message: string
  propertyId?: string
  createdAt: string
  status: 'new' | 'contacted' | 'closed'
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff'
}

// Search filters
export interface PropertyFilters {
  type?: 'land' | 'house'
  district?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
}

// Blog
export interface Blog {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  coverImage?: string
  author: string
  status: 'draft' | 'published'
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

// Team Member
export interface TeamMember {
  id: string
  name: string
  role: string
  bio?: string
  image?: string
  email?: string
  phone?: string
  linkedin?: string
  twitter?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Lead System Types
export type LeadQuality = 'cold' | 'warm' | 'hot'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LeadIntent = 'buy' | 'rent' | 'invest' | 'undecided'

export interface Lead {
  id: string
  // Contact Info
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  // Attribution
  visitorId?: string
  sessionId?: string
  source?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  referrer?: string
  landingPage?: string
  // Device & Location
  deviceType?: string
  browser?: string
  country?: string
  city?: string
  // Scoring
  score: number
  scoreBreakdown: Record<string, number>
  quality: LeadQuality
  // Engagement
  totalVisits: number
  totalSessions: number
  totalPageViews: number
  totalPropertyViews: number
  propertiesViewed: string[]
  mostViewedPropertyId?: string
  totalContactClicks: number
  savedProperties: string[]
  // Timestamps
  firstVisitAt?: string
  lastVisitAt?: string
  firstContactAt: string
  lastActivityAt: string
  // Status
  status: LeadStatus
  assignedTo?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LeadPreferences {
  id: string
  leadId: string
  intent?: LeadIntent
  propertyTypes: string[]
  preferredDistricts: string[]
  minBedrooms?: number
  maxBedrooms?: number
  minBudget?: number
  maxBudget?: number
  landSizeMin?: number
  landSizeMax?: number
  requiredFeatures: string[]
  timeline?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LeadPropertyInterest {
  id: string
  leadId: string
  propertyId: string
  interestType: 'viewed' | 'saved' | 'inquired' | 'viewing_requested'
  viewCount: number
  totalTimeSeconds: number
  galleryViews: number
  mapInteractions: number
  firstViewedAt: string
  lastViewedAt: string
  inquiredAt?: string
  viewingRequestedAt?: string
  // Joined data
  property?: Property
}

export interface LeadEvent {
  id: string
  leadId: string
  eventType: string
  eventLabel?: string
  propertyId?: string
  propertyTitle?: string
  pagePath?: string
  metadata: Record<string, unknown>
  occurredAt: string
  createdAt: string
}

export interface ViewingRequest {
  id: string
  leadId?: string
  propertyId: string
  name: string
  phone: string
  email?: string
  preferredDate?: string
  preferredTime?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  confirmedDatetime?: string
  visitorNotes?: string
  agentNotes?: string
  visitorId?: string
  sessionId?: string
  createdAt: string
  updatedAt: string
  // Joined data
  property?: Property
  lead?: Lead
}

export interface SavedProperty {
  id: string
  visitorId: string
  propertyId: string
  savedAt: string
  // Joined data
  property?: Property
}

// Lead Capture Popup Types
export type PopupType = 'property_interest' | 'request_details' | 'schedule_viewing' | 'property_match' | 'exit_intent'

export interface PopupDismissal {
  popupType: PopupType
  propertyId?: string
  dismissedAt: string
}

// Lead capture form data
export interface LeadCaptureFormData {
  name: string
  phone?: string
  whatsapp?: string
  email?: string
  intent?: LeadIntent
  preferredDistricts?: string[]
  propertyTypes?: string[]
  minBudget?: number
  maxBudget?: number
  timeline?: string
  preferredDate?: string
  preferredTime?: string
  message?: string
}

// Lead with full details for admin view
export interface LeadWithDetails extends Lead {
  preferences?: LeadPreferences
  propertyInterests: LeadPropertyInterest[]
  events: LeadEvent[]
  viewingRequests: ViewingRequest[]
  mostViewedProperty?: Property
}
