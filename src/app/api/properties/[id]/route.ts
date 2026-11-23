import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getSession, requireRole } from '@/lib/auth'
import { emitEvent } from '@/lib/email/events'
import { kickWorker } from '@/lib/email/worker'

// GET single property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Signed-in staff also see sold and hidden listings
  const viewer = await getSession()
  const supabase = viewer ? await createAdminClient() : await createClient()

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
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

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
    if (body.variations !== undefined) updates.variations = body.variations
    if (body.status !== undefined) updates.status = body.status
    if (body.featured !== undefined) updates.featured = body.featured

    const { data: before } = await supabase.from('properties').select('price, status').eq('id', id).maybeSingle()

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

    // Tell interested people about price and availability changes
    if (before) {
      const stamp = new Date().toISOString()
      if (Number(before.price) !== Number(data.price) && Number(data.price) > 0 && data.status === 'available') {
        await emitEvent('property.price_changed', { property_id: id, old_price: Number(before.price), new_price: Number(data.price), subject_key: `price:${id}:${data.price}` }, `property.price_changed:${id}:${data.price}`)
      }
      if (before.status === 'available' && data.status !== 'available') {
        await emitEvent('property.unavailable', { property_id: id, status: data.status, subject_key: `unavailable:${id}` }, `property.unavailable:${id}:${stamp}`)
      }
      if (before.status !== 'available' && data.status === 'available') {
        // Back on the market (or first published): announce once per property
        await emitEvent('property.published', { property_id: id, subject_key: `property:${id}` }, `property.published:${id}`)
      }
      kickWorker('property')
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
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth

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
