// Simple in-memory store for properties and inquiries
// In production, this would be replaced with a database like PostgreSQL, MongoDB, or Supabase

import { Property, ContactInquiry } from './types'
import { properties as initialProperties } from '@/data/properties'

// In-memory storage (resets on server restart)
// For persistence, integrate with a database or use file-based storage
let propertiesStore: Property[] = [...initialProperties]
let inquiriesStore: ContactInquiry[] = []

// Property operations
export function getAllProperties(): Property[] {
  return propertiesStore
}

export function getPropertyById(id: string): Property | undefined {
  return propertiesStore.find(p => p.id === id)
}

export function createProperty(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
  const newProperty: Property = {
    ...property,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  propertiesStore.push(newProperty)
  return newProperty
}

export function updateProperty(id: string, updates: Partial<Property>): Property | null {
  const index = propertiesStore.findIndex(p => p.id === id)
  if (index === -1) return null

  propertiesStore[index] = {
    ...propertiesStore[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  return propertiesStore[index]
}

export function deleteProperty(id: string): boolean {
  const index = propertiesStore.findIndex(p => p.id === id)
  if (index === -1) return false
  propertiesStore.splice(index, 1)
  return true
}

// Inquiry operations
export function getAllInquiries(): ContactInquiry[] {
  return inquiriesStore
}

export function createInquiry(inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'status'>): ContactInquiry {
  const newInquiry: ContactInquiry = {
    ...inquiry,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    status: 'new',
  }
  inquiriesStore.push(newInquiry)
  return newInquiry
}

export function updateInquiryStatus(id: string, status: ContactInquiry['status']): ContactInquiry | null {
  const index = inquiriesStore.findIndex(i => i.id === id)
  if (index === -1) return null
  inquiriesStore[index].status = status
  return inquiriesStore[index]
}

// Admin authentication using environment variables
export function validateAdmin(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL or ADMIN_PASSWORD not set in environment variables')
    return false
  }

  return email === adminEmail && password === adminPassword
}
