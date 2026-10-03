import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

const EDITABLE = ['whatsapp_number', 'phone_number', 'email', 'instagram_handle', 'address']

const defaultSettings = {
  whatsapp_number: '2349160531000',
  phone_number: '0916 053 1000',
  email: 'hello@sabiconsults.com.ng',
  instagram_handle: 'sabi_consults',
  address: '3rd Floor, 137 Ademola Adetokunbo Crescent, Wuse 2, FCT-Abuja'
}

// GET /api/settings - Public endpoint to fetch all settings
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Return defaults if env vars not configured
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(defaultSettings)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')

    if (error) {
      console.error('Error fetching settings:', error)
      // Return default settings if table doesn't exist yet
      return NextResponse.json(defaultSettings)
    }

    // Convert array of {key, value} to object
    const settings = data.reduce((acc: Record<string, string>, item) => {
      acc[item.key] = item.value
      return acc
    }, {})

    return NextResponse.json({ ...defaultSettings, ...settings })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(defaultSettings)
  }
}

// PUT /api/settings - Admin endpoint to update settings
export async function PUT(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const auth = await requireRole('admin')
    if (auth instanceof NextResponse) return auth

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    // Only contact settings here; brand settings go through /api/branding (super admin)
    const updates = Object.fromEntries(Object.entries(body).filter(([k, v]) => EDITABLE.includes(k) && typeof v === 'string'))

    // Update each setting
    for (const [key, value] of Object.entries(updates)) {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key,
          value: value as string,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error(`Error updating ${key}:`, error)
        throw error
      }
    }

    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
