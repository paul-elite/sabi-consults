// Server-side brand loading. Pure helpers live in brand-shared.ts.
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_BRAND, brandFromRows, type Brand } from './brand-shared'

export * from './brand-shared'

/** Server-side: read the brand once per request. Falls back to defaults if the DB isn’t set up. */
export const getBrand = cache(async (): Promise<Brand> => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return DEFAULT_BRAND
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await db
      .from('site_settings')
      .select('key, value')
      .like('key', 'brand_%')
    if (error) return DEFAULT_BRAND
    return brandFromRows(data)
  } catch {
    return DEFAULT_BRAND
  }
})
