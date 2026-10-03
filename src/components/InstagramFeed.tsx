'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, InstagramIcon, PlayIcon } from '@hugeicons/core-free-icons'

import { useSiteSettings } from './BrandProvider'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface InstagramPost {
  id: string
  mediaUrl: string
  permalink: string
  caption?: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
}

export default function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const instagramHandle = useSiteSettings().instagram_handle

  useEffect(() => {
    async function fetchInstagramPosts() {
      try {
        const res = await fetch('/api/instagram')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (data.posts && data.posts.length > 0) {
          setPosts(data.posts.slice(0, 6))
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchInstagramPosts()
  }, [])

  // Show placeholder if no posts or error
  if (error || (!loading && posts.length === 0)) {
    return (
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-medium text-brand uppercase tracking-wider mb-2">
              Follow Us
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-ink mb-4">
              @{instagramHandle}
            </h2>
            <p className="text-neutral-600">
              Follow us on Instagram for the latest property updates and market insights
            </p>
          </div>

          <div className="text-center mt-6">
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <HugeiconsIcon icon={InstagramIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              Follow @{instagramHandle}
            </a>
          </div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-brand uppercase tracking-wider mb-2">
              Follow Us
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-ink">
              @{instagramHandle}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="rounded-xl overflow-hidden aspect-square bg-neutral-100 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-brand uppercase tracking-wider mb-2">
            Follow Us
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-ink mb-4">
            @{instagramHandle}
          </h2>
          <p className="text-neutral-600">
            Latest updates from our Instagram
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl relative aspect-square group overflow-hidden bg-neutral-100"
            >
              <Image
                src={post.mediaUrl}
                alt={post.caption?.slice(0, 100) || 'Instagram post'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
              {post.mediaType === 'VIDEO' && (
                <div className="absolute top-2 right-2">
                  <HugeiconsIcon icon={PlayIcon} className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={1.7} aria-hidden="true" />
                </div>
              )}
              {post.mediaType === 'CAROUSEL_ALBUM' && (
                <div className="absolute top-2 right-2">
                  <HugeiconsIcon icon={Copy01Icon} className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={1.7} aria-hidden="true" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <HugeiconsIcon icon={InstagramIcon} className="w-8 h-8 text-white" strokeWidth={1.7} aria-hidden="true" />
              </div>
            </a>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <HugeiconsIcon icon={InstagramIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
            Follow @{instagramHandle}
          </a>
        </div>
      </div>
    </section>
  )
}
