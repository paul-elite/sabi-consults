// Core data types for Sabi Consults

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
