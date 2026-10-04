import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { requireRole } from '@/lib/auth'
import { isStorageImageUrl } from '@/lib/storage-url'
import { rateLimit } from '@/lib/rate-limit'

// The browser-supplied type is only a claim; check the file's leading bytes match it
function matchesSignature(type: string, b: Uint8Array): boolean {
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v)
  const ascii = (offset: number, text: string) => [...text].every((c, i) => b[offset + i] === c.charCodeAt(0))
  switch (type) {
    case 'image/jpeg': return starts(0xff, 0xd8, 0xff)
    case 'image/png': return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'image/gif': return ascii(0, 'GIF87a') || ascii(0, 'GIF89a')
    case 'image/webp': return ascii(0, 'RIFF') && ascii(8, 'WEBP')
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon': return starts(0x00, 0x00, 0x01, 0x00)
    case 'image/svg+xml': {
      const head = new TextDecoder().decode(b.slice(0, 1024)).replace(/^\uFEFF/, '').trimStart()
      return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/i.test(head)
    }
    default: return false
  }
}

// SVG is text that can carry script. Refuse anything beyond plain drawing markup.
const SVG_DANGER = /<script|<foreignobject|<iframe|<embed|<object|<animate|<set\b|<handler|<!entity|<!doctype(?! svg)|javascript:|data:|\son[a-z]+\s*=|(xlink:)?href\s*=\s*(?!["']?\s*#)|&#|@import|url\(\s*(?!["']?#)/i

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await requireRole('staff')
    if (currentUser instanceof NextResponse) return currentUser

    if (!rateLimit(`upload:${currentUser.id}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Upload limit reached. Try again in an hour.' }, { status: 429 })
    }
    if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 413 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Use a JPG, PNG, WebP, GIF, SVG or ICO image.' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Generate unique filename
    // Pick the extension from the checked file type, never from the file name
    const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico' }
    const ext = EXT[file.type]
    const timestamp = Date.now()
    const randomStr = randomUUID()
    const requested = String(formData.get('folder') || 'properties')
    const folder = ['properties', 'brand', 'team', 'blog'].includes(requested) ? requested : 'properties'

    if (file.type === 'image/svg+xml' && (folder !== 'brand' || currentUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'SVG uploads are restricted to super admin brand assets.' }, { status: 403 })
    }

    const filename = `${folder}/${timestamp}-${randomStr}.${ext}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    if (!matchesSignature(file.type, buffer)) {
      return NextResponse.json({ error: 'That file isn’t a valid image of the type it claims to be.' }, { status: 400 })
    }

    // SVGs are text and can hide scripts or pull in outside files: refuse any that do
    if (file.type === 'image/svg+xml' && SVG_DANGER.test(new TextDecoder().decode(buffer))) {
      return NextResponse.json({ error: 'This SVG contains scripts, links or embedded files. Export it again as a plain SVG or PNG.' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await requireRole('staff')
    if (currentUser instanceof NextResponse) return currentUser

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Only files in this project's bucket, in a known folder, with no path tricks
    if (!isStorageImageUrl(url)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }
    const path = decodeURIComponent(new URL(url).pathname.replace('/storage/v1/object/public/images/', ''))
    const match = path.match(/^(properties|brand|team|blog)\/[\w.-]+$/)
    if (!match || path.includes('..')) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }
    // Brand assets (logo, favicon) can only be removed by a super admin
    if (match[1] === 'brand' && currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only a super admin can remove brand images' }, { status: 403 })
    }
    const supabase = await createAdminClient()

    const { error } = await supabase.storage
      .from('images')
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
