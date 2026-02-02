'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ImageUploader from '@/components/ImageUploader'

// Dynamic import for rich text editor
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="min-h-[400px] bg-neutral-100 animate-pulse" />,
})

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewBlogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    author: 'Sabi Consults',
    status: 'draft' as 'draft' | 'published',
  })
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState<string[]>([])
  const [autoSlug, setAutoSlug] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth')
        const data = await res.json()
        if (!data.authenticated) {
          router.push('/admin')
        }
      } catch {
        router.push('/admin')
      }
    }
    checkAuth()
  }, [router])

  const handleTitleChange = (title: string) => {
    setForm(prev => ({
      ...prev,
      title,
      slug: autoSlug ? generateSlug(title) : prev.slug,
    }))
  }

  const handleSlugChange = (slug: string) => {
    setAutoSlug(false)
    setForm(prev => ({ ...prev, slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          content,
          coverImage: coverImage[0] || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create blog post')
      }

      router.push('/admin/blog')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create blog post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/blog" className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-xl font-semibold">New Blog Post</span>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title & Slug */}
          <div className="bg-white border border-neutral-200 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-lg focus:outline-none focus:border-neutral-400"
                  placeholder="Enter blog post title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="px-4 py-3 bg-neutral-100 border border-r-0 border-neutral-200 text-sm text-neutral-500">
                    /blog/
                  </span>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="url-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Excerpt
                </label>
                <textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 resize-none"
                  placeholder="Brief description for previews and SEO"
                />
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="bg-white border border-neutral-200 p-6">
            <h2 className="font-medium text-[#1a1a1a] mb-4">Cover Image</h2>
            <ImageUploader
              images={coverImage}
              onChange={setCoverImage}
              maxImages={1}
            />
          </div>

          {/* Content */}
          <div className="bg-white border border-neutral-200 p-6">
            <h2 className="font-medium text-[#1a1a1a] mb-4">Content *</h2>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your blog post content here..."
            />
          </div>

          {/* Settings & Submit */}
          <div className="bg-white border border-neutral-200 p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
                    className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <Link
                  href="/admin/blog"
                  className="px-6 py-3 border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="px-6 py-3 bg-[#0055CC] text-white text-sm font-medium hover:bg-[#0044aa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : form.status === 'published' ? 'Publish' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
