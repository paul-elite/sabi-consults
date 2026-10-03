import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession, sameOrigin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getSession()

    if (!currentUser || !(await sameOrigin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
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
    const randomStr = Math.random().toString(36).substring(2, 8)
    const requested = String(formData.get('folder') || 'properties')
    const folder = ['properties', 'brand', 'team', 'blog'].includes(requested) ? requested : 'properties'
    const filename = `${folder}/${timestamp}-${randomStr}.${ext}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // SVGs are text and can hide scripts: refuse any that contain them
    if (file.type === 'image/svg+xml') {
      const text = new TextDecoder().decode(buffer).toLowerCase()
      if (/<script|javascript:|\son[a-z]+\s*=|<foreignobject|<iframe|<embed/.test(text)) {
        return NextResponse.json({ error: 'This SVG contains scripts. Export it again as a plain SVG or PNG.' }, { status: 400 })
      }
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
    const currentUser = await getSession()

    if (!currentUser || !(await sameOrigin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Extract path from URL
    const match = url.match(/\/images\/(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }

    const path = match[1]
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
