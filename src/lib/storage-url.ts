// Image URLs saved by the admin must point at this project's public storage bucket,
// so a stored profile or team photo can't be swapped for a tracking pixel or an off-site file.
export function isStorageImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    return url.protocol === 'https:' && url.host === base.host && url.pathname.startsWith('/storage/v1/object/public/images/')
  } catch {
    return false
  }
}
