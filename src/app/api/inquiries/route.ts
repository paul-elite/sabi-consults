import { cleanText } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'

// GET all inquiries (admin only)
export async function GET() {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inquiries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inquiries' },
      { status: 500 }
    )
  }

  // Transform to camelCase
  const inquiries = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    propertyId: row.property_id,
    status: row.status,
    createdAt: row.created_at,
  }))

  return NextResponse.json(inquiries)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST create new inquiry (public)
export async function POST(request: NextRequest) {
  try {
    const raw = await readJson(request, 16 * 1024)
    if (raw instanceof NextResponse) return raw

    // Hidden "website" field: real visitors never fill it in, bots usually do
    if (raw.website) return NextResponse.json({ success: true }, { status: 201 })

    const limitKey = `inquiry:${clientIp(request)}`
    if (isLimited(limitKey, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'You’ve sent several messages already. Please call or WhatsApp us instead.' }, { status: 429 })
    }

    const body = {
      name: cleanText(raw.name, 120),
      email: cleanText(raw.email, 200).toLowerCase(),
      phone: cleanText(raw.phone, 40),
      message: cleanText(raw.message, 3000),
      propertyId: typeof raw.propertyId === 'string' && UUID.test(raw.propertyId) ? raw.propertyId : null,
    }

    const missing = (['name', 'email', 'phone', 'message'] as const).find(f => !body[f])
    if (missing) {
      return NextResponse.json({ error: `Enter your ${missing}` }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Enter an email like name@example.com' }, { status: 400 })
    }
    if (body.phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Enter a phone number we can reach you on' }, { status: 400 })
    }
    rateLimit(limitKey, 5, 10 * 60 * 1000)

    // Use admin client for inserts
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
        property_id: body.propertyId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating inquiry:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    const row = data as Record<string, unknown>
    return NextResponse.json({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      propertyId: row.property_id,
      status: row.status,
      createdAt: row.created_at,
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
