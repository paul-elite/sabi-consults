import { NextResponse } from 'next/server'

// Cache the Instagram posts for 1 hour to avoid rate limits
let cachedPosts: InstagramPost[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

interface InstagramPost {
  id: string
  mediaUrl: string
  permalink: string
  caption?: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
}

interface InstagramAPIResponse {
  data: Array<{
    id: string
    media_url: string
    permalink: string
    caption?: string
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
    thumbnail_url?: string
  }>
}

export async function GET() {
  // Check if we have a valid access token
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN

  if (!accessToken) {
    // Return empty if no token configured - component will show placeholder
    return NextResponse.json({ posts: [], message: 'Instagram not configured' })
  }

  // Check cache
  const now = Date.now()
  if (cachedPosts && (now - cacheTimestamp) < CACHE_DURATION) {
    return NextResponse.json({ posts: cachedPosts })
  }

  try {
    // Fetch from Instagram Graph API
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_url,permalink,caption,media_type,thumbnail_url&access_token=${accessToken}&limit=6`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      console.error('Instagram API error:', response.status)
      return NextResponse.json({ posts: [], error: 'Failed to fetch Instagram posts' })
    }

    const data: InstagramAPIResponse = await response.json()

    // Transform the data
    const posts: InstagramPost[] = data.data.map((post) => ({
      id: post.id,
      mediaUrl: post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url,
      permalink: post.permalink,
      caption: post.caption,
      mediaType: post.media_type,
    }))

    // Update cache
    cachedPosts = posts
    cacheTimestamp = now

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error fetching Instagram posts:', error)
    return NextResponse.json({ posts: [], error: 'Failed to fetch Instagram posts' })
  }
}
