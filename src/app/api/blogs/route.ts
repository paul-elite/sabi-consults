import { cleanHtml, cleanText } from '@/lib/sanitize'
import { getBrand } from '@/lib/brand'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession, sameOrigin } from '@/lib/auth'

// GET all blogs (admin - includes drafts)
export async function GET() {
  try {
    const currentUser = await getSession()

    // If not authenticated, only return published blogs
    const supabase = await createAdminClient()

    let query = supabase
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false })

    if (!currentUser || !(await sameOrigin())) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching blogs:', error)
    return NextResponse.json({ error: 'Failed to fetch blogs' }, { status: 500 })
  }
}

// POST create new blog
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSession()

    if (!currentUser || !(await sameOrigin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, excerpt, content, coverImage, author, status } = body

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Title, slug, and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    const blogData: Record<string, unknown> = {
      title: cleanText(title, 200),
      slug,
      excerpt: excerpt ? cleanText(excerpt, 500) : null,
      content: cleanHtml(content),
      cover_image: coverImage || null,
      author: author ? cleanText(author, 100) : (await getBrand()).name,
      status: status || 'draft',
      updated_at: new Date().toISOString(),
    }

    // Set published_at if publishing
    if (status === 'published') {
      blogData.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('blogs')
      .insert(blogData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A blog with this slug already exists' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating blog:', error)
    return NextResponse.json({ error: 'Failed to create blog' }, { status: 500 })
  }
}
