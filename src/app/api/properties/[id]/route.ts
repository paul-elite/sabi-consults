import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET single property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Property not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(transformProperty(data))
}

// PUT update property (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const body = await request.json()
    const supabase = await createAdminClient()

    // Build update object with snake_case keys
    const updates: Record<string, unknown> = {}

    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.price !== undefined) updates.price = Number(body.price)
    if (body.priceLabel !== undefined) updates.price_label = body.priceLabel
    if (body.type !== undefined) updates.type = body.type
    if (body.district !== undefined) updates.district = body.district
    if (body.address !== undefined) updates.address = body.address
    if (body.latitude !== undefined) updates.latitude = Number(body.latitude)
    if (body.longitude !== undefined) updates.longitude = Number(body.longitude)
    if (body.bedrooms !== undefined) updates.bedrooms = body.bedrooms ? Number(body.bedrooms) : null
    if (body.bathrooms !== undefined) updates.bathrooms = body.bathrooms ? Number(body.bathrooms) : null
    if (body.bq !== undefined) updates.bq = body.bq ? Number(body.bq) : 0
    if (body.landSize !== undefined) updates.land_size = body.landSize ? Number(body.landSize) : null
    if (body.images !== undefined) updates.images = body.images
    if (body.features !== undefined) updates.features = body.features
    if (body.status !== undefined) updates.status = body.status
    if (body.featured !== undefined) updates.featured = body.featured

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(transformProperty(data))
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// DELETE property (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

// Helper function to transform snake_case to camelCase
function transformProperty(row: Record<string, unknown>) {
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
    status: row.status,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
