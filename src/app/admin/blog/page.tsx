'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Delete02Icon, Edit01Icon, LinkSquare01Icon, News01Icon } from '@hugeicons/core-free-icons'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAdminUser, canAccess } from '@/components/admin/AdminNav'

interface Blog {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: 'draft' | 'published'
  author: string
  published_at: string | null
  created_at: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function AdminBlogPage() {
  const router = useRouter()
  const user = useAdminUser()
  const canDelete = canAccess(user, 'admin') // admin or super_admin can delete
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.authenticated) {
          router.push('/admin')
          return
        }

        const res = await fetch('/api/blogs')
        const data = await res.json()
        setBlogs(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBlogs(blogs.filter(b => b.id !== id))
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-neutral-500 hover:text-ink transition-colors">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
            </Link>
            <span className="text-lg font-semibold text-ink">Blog Posts</span>
          </div>
          <Link href="/admin/blog/new" className="btn btn-md btn-brand">
            New Post
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {blogs.length === 0 ? (
          <div className="card p-12 text-center">
            <HugeiconsIcon icon={News01Icon} className="w-12 h-12 mx-auto text-neutral-300 mb-4" strokeWidth={1.7} aria-hidden="true" />
            <p className="text-neutral-500 mb-4">No blog posts yet</p>
            <Link href="/admin/blog/new" className="btn btn-md btn-brand">
              Create Your First Post
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {blogs.map((blog) => (
                  <tr key={blog.id}>
                    <td>
                      <div>
                        <p className="font-medium text-ink">{blog.title}</p>
                        <p className="text-sm text-neutral-500 truncate max-w-md">{blog.excerpt || 'No excerpt'}</p>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${blog.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                        {blog.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="text-neutral-600">{blog.author}</td>
                    <td className="text-neutral-600">
                      {blog.published_at ? formatDate(blog.published_at) : formatDate(blog.created_at)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {blog.status === 'published' && (
                          <Link
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="View"
                          >
                            <HugeiconsIcon icon={LinkSquare01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                          </Link>
                        )}
                        <Link
                          href={`/admin/blog/${blog.id}`}
                          className="p-2 text-neutral-400 hover:text-brand transition-colors"
                          title="Edit"
                        >
                          <HugeiconsIcon icon={Edit01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(blog.id, blog.title)}
                            disabled={deleting === blog.id}
                            className="p-2 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
