import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET /api/settings - Public endpoint to fetch all settings
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')

    if (error) {
      console.error('Error fetching settings:', error)
      // Return default settings if table doesn't exist yet
      return NextResponse.json({
        whatsapp_number: '2348000000000',
        phone_number: '+234 800 000 0000',
        email: 'hello@sabiconsults.com',
        instagram_handle: 'sabi_consults',
        address: 'Abuja, Nigeria'
      })
    }

    // Convert array of {key, value} to object
    const settings = data.reduce((acc: Record<string, string>, item) => {
      acc[item.key] = item.value
      return acc
    }, {})

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Admin endpoint to update settings
export async function PUT(request: Request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const expectedEmail = process.env.ADMIN_EMAIL
    const expectedPassword = process.env.ADMIN_PASSWORD
    const expectedToken = Buffer.from(`${expectedEmail}:${expectedPassword}`).toString('base64')

    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const updates = await request.json()

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
