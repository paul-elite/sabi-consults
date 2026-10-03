import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth'
import { BRAND_KEYS, Brand, getBrand, isHex } from '@/lib/brand'

// GET /api/branding – current brand (public)
export async function GET() {
  return NextResponse.json(await getBrand())
}

// PUT /api/branding – update name, logo and palette (super admin only)
export async function PUT(request: NextRequest) {
  const auth = await requireRole('super_admin')
  if (auth instanceof NextResponse) return auth

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })

  const body = (await request.json()) as Partial<Brand>
  const errors: Record<string, string> = {}
  if (body.name !== undefined && !String(body.name).trim()) errors.name = 'Enter a company name.'
  if (body.name && String(body.name).length > 60) errors.name = 'Keep the name under 60 characters.'
  for (const f of ['colorPrimary', 'colorInk', 'colorSurface'] as const) {
    if (body[f] !== undefined && !isHex(body[f])) errors[f] = 'Use a colour like #0055CC.'
  }
  for (const f of ['logoUrl', 'logoDarkUrl', 'faviconUrl'] as const) {
    const v = body[f]
    if (v && !/^(https?:\/\/|\/)/.test(String(v))) errors[f] = 'Use an uploaded image or a full https:// link.'
  }
  if (Object.keys(errors).length) return NextResponse.json({ error: 'Check the highlighted fields', fields: errors }, { status: 400 })

  const rows = (Object.keys(BRAND_KEYS) as (keyof Brand)[])
    .filter(f => body[f] !== undefined)
    .map(f => ({ key: BRAND_KEYS[f], value: String(body[f] ?? '').trim(), updated_at: new Date().toISOString() }))

  const db = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await db.from('site_settings').upsert(rows)
  if (error) {
    console.error('Branding update failed:', error)
    return NextResponse.json({ error: 'Couldn’t save branding. Run supabase/setup.sql if this is a new database.' }, { status: 500 })
  }

  // Refresh every page so the new brand shows straight away
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}
