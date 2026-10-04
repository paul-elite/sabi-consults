'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, Facebook02Icon, InstagramIcon, PlayIcon } from '@hugeicons/core-free-icons'

import { useSiteSettings } from './BrandProvider'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Eyebrow from './Eyebrow'

interface InstagramPost {
  id: string
  mediaUrl: string
  permalink: string
  caption?: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
}

function SocialCards({ instagramHandle }: { instagramHandle: string }) {
  const cards = [
    {
      label: 'Instagram',
      title: `@${instagramHandle}`,
      copy: 'Fresh listings, inspection clips, and Abuja market updates.',
      href: `https://instagram.com/${instagramHandle}`,
      icon: InstagramIcon,
      className: 'from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
    },
    {
      label: 'Facebook',
      title: 'Sabi Consults',
      copy: 'Property highlights, client updates, and community posts.',
      href: 'https://facebook.com/sabiconsults',
      icon: Facebook02Icon,
      className: 'from-[#1877f2] to-[#0b4fb3]',
    },
  ]

  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
      {cards.map((card) => (
        <a
          key={card.label}
          href={card.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl bg-white border border-blue-100 p-5 md:p-6 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
        >
          <div className={`mb-5 h-12 w-12 rounded-2xl bg-gradient-to-br ${card.className} text-white grid place-items-center`}>
            <HugeiconsIcon icon={card.icon} className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-brand font-semibold">{card.label}</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">{card.title}</h3>
          <p className="mt-3 text-sm text-neutral-600">{card.copy}</p>
          <span className="mt-5 inline-flex text-sm font-medium text-brand group-hover:text-brand-dark transition-colors">
            Open {card.label}
          </span>
        </a>
      ))}
    </div>
  )
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
          <div className="text-center mb-8 md:mb-10">
            <Eyebrow icon="clients" center className="mx-auto mb-3">Follow Us</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-4">
              Follow Sabi Consults
            </h2>
            <p className="text-neutral-600 mx-auto">
              Get the latest property updates and market insights.
            </p>
          </div>
          <SocialCards instagramHandle={instagramHandle} />
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow icon="clients" center className="mx-auto mb-3">Follow Us</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-semibold text-ink">
              Follow Sabi Consults
            </h2>
          </div>
          <SocialCards instagramHandle={instagramHandle} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-8">
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
        <div className="text-center mb-10">
          <Eyebrow icon="clients" center className="mx-auto mb-3">Follow Us</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-4">
            Follow Sabi Consults
          </h2>
          <p className="text-neutral-600 mx-auto">
            Property updates, inspection clips, and market insights.
          </p>
        </div>

        <SocialCards instagramHandle={instagramHandle} />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-8">
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

      </div>
    </section>
  )
}
