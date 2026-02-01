// Core data types for Sabi Consults

export interface Property {
  id: string
  title: string
  description: string
  price: number
  priceLabel?: string // e.g., "Per Annum" for rentals
  type: 'sale' | 'rent'
  propertyType: 'house' | 'apartment' | 'land' | 'commercial' | 'villa'
  district: string
  address: string
  latitude: number
  longitude: number
  bedrooms?: number
  bathrooms?: number
  size?: number // in sqm
  images: string[]
  features: string[]
  status: 'available' | 'sold' | 'rented' | 'pending'
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
  type?: 'sale' | 'rent'
  propertyType?: Property['propertyType']
  district?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
}
