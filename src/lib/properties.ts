import { createClient } from '@/lib/supabase/server'
import { Property } from '@/lib/types'

// Transform Supabase row to Property type
function transformProperty(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    price: row.price as number,
    priceLabel: row.price_label as string | undefined,
    type: row.type as 'land' | 'house',
    district: row.district as string,
    address: row.address as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    bedrooms: row.bedrooms as number | undefined,
    bathrooms: row.bathrooms as number | undefined,
    bq: row.bq as number | undefined,
    landSize: row.land_size as number | undefined,
    images: row.images as string[],
    features: row.features as string[],
    status: row.status as Property['status'],
    featured: row.featured as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Get all properties
export async function getAllProperties(): Promise<Property[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching properties:', error)
    return []
  }

  return data.map(transformProperty)
}

// Get single property by ID
export async function getPropertyById(id: string): Promise<Property | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return transformProperty(data)
}

// Get featured properties
export async function getFeaturedProperties(): Promise<Property[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('featured', true)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(4)

  if (error) {
    console.error('Error fetching featured properties:', error)
    return []
  }

  return data.map(transformProperty)
}

// Get properties by district
export async function getPropertiesByDistrict(district: string): Promise<Property[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .ilike('district', district)
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching properties by district:', error)
    return []
  }

  return data.map(transformProperty)
}

// Filter properties
export async function filterProperties(filters: {
  type?: string
  district?: string
  minPrice?: number
  maxPrice?: number
}): Promise<Property[]> {
  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (filters.type) {
    query = query.eq('type', filters.type)
  }
  if (filters.district) {
    query = query.ilike('district', filters.district)
  }
  if (filters.minPrice) {
    query = query.gte('price', filters.minPrice)
  }
  if (filters.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error filtering properties:', error)
    return []
  }

  return data.map(transformProperty)
}

// Get all property IDs (for static generation)
export async function getAllPropertyIds(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('properties')
    .select('id')

  if (error) {
    console.error('Error fetching property IDs:', error)
    return []
  }

  return data.map((row) => row.id)
}
