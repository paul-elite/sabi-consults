import { createClient } from '@/lib/supabase/server'
import { Blog } from './types'

// Transform database row to Blog type
function transformBlog(row: Record<string, unknown>): Blog {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: row.excerpt as string | undefined,
    content: row.content as string,
    coverImage: row.cover_image as string | undefined,
    author: row.author as string,
    status: row.status as 'draft' | 'published',
    publishedAt: row.published_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function getAllBlogs(): Promise<Blog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching blogs:', error)
    return []
  }

  return (data || []).map(transformBlog)
}

export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    console.error('Error fetching blog:', error)
    return null
  }

  return data ? transformBlog(data) : null
}

export async function getRecentBlogs(limit: number = 3): Promise<Blog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent blogs:', error)
    return []
  }

  return (data || []).map(transformBlog)
}
