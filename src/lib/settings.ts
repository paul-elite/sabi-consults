import { createClient } from '@supabase/supabase-js'

export interface SiteSettings {
  whatsapp_number: string
  phone_number: string
  email: string
  instagram_handle: string
  address: string
}

const defaultSettings: SiteSettings = {
  whatsapp_number: '2348000000000',
  phone_number: '+234 800 000 0000',
  email: 'hello@sabiconsults.com',
  instagram_handle: 'sabi_consults',
  address: 'Abuja, Nigeria'
}

// Server-side function to fetch settings
export async function getSettings(): Promise<SiteSettings> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return defaultSettings
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')

    if (error || !data) {
      return defaultSettings
    }

    const settings = data.reduce((acc: Record<string, string>, item) => {
      acc[item.key] = item.value
      return acc
    }, {})

    return {
      ...defaultSettings,
      ...settings
    }
  } catch {
    return defaultSettings
  }
}
