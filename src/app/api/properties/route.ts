import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET all properties
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Build query
  let query = supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply filters
  const type = searchParams.get('type')
  const district = searchParams.get('district')
  const featured = searchParams.get('featured')
  const status = searchParams.get('status')

  if (type) {
    query = query.eq('type', type)
  }
  if (district) {
    query = query.ilike('district', district)
  }
  if (featured === 'true') {
    query = query.eq('featured', true)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }

  // Transform snake_case to camelCase for frontend
  const properties = data.map(transformProperty)

  return NextResponse.json(properties)
}

// POST create new property (admin only)
export async function POST(request: NextRequest) {
  // Check for admin session
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'description', 'price', 'type', 'district', 'address', 'latitude', 'longitude']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('properties')
      .insert({
        title: body.title,
        description: body.description,
        price: Number(body.price),
        price_label: body.priceLabel || null,
        type: body.type,
        district: body.district,
        address: body.address,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        bedrooms: body.bedrooms ? Number(body.bedrooms) : null,
        bathrooms: body.bathrooms ? Number(body.bathrooms) : null,
        bq: body.bq ? Number(body.bq) : 0,
        land_size: body.landSize ? Number(body.landSize) : null,
        images: body.images || [],
        features: body.features || [],
        variations: body.variations || [],
        status: body.status || 'available',
        featured: body.featured || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating property:', error)
      return NextResponse.json(
        { error: 'Failed to create property' },
        { status: 500 }
      )
    }

    return NextResponse.json(transformProperty(data), { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// Helper function to transform snake_case to camelCase
function transformProperty(row: Record<string, unknown>) {
  // Parse variations - ensure it's an array or undefined
  const variations = row.variations && Array.isArray(row.variations) && row.variations.length > 0
    ? row.variations
    : undefined

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    priceLabel: row.price_label,
    type: row.type,
    district: row.district,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    bq: row.bq,
    landSize: row.land_size,
    images: row.images,
    features: row.features,
    variations,
    status: row.status,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
