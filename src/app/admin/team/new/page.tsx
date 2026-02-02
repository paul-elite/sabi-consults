'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageUploader from '@/components/ImageUploader'

export default function NewTeamMemberPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [image, setImage] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    role: '',
    bio: '',
    email: '',
    phone: '',
    linkedin: '',
    twitter: '',
    displayOrder: '0',
    isActive: true,
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          image: image[0] || null,
          displayOrder: parseInt(form.displayOrder) || 0,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add team member')
      }

      router.push('/admin/team')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team member')
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
            <Link href="/admin/team" className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-xl font-semibold">Add Team Member</span>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo */}
          <div className="bg-white border border-neutral-200 p-6">
            <h2 className="font-medium text-[#1a1a1a] mb-4">Photo</h2>
            <ImageUploader
              images={image}
              onChange={setImage}
              maxImages={1}
            />
          </div>

          {/* Basic Info */}
          <div className="bg-white border border-neutral-200 p-6">
            <h2 className="font-medium text-[#1a1a1a] mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="e.g., Adaeze Okonkwo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Role/Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="e.g., Principal Consultant"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Bio
                </label>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 resize-none"
                  placeholder="Brief description of their background and expertise..."
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white border border-neutral-200 p-6">
            <h2 className="font-medium text-[#1a1a1a] mb-4">Contact & Social</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="+234..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={form.linkedin}
                    onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Twitter/X URL
                  </label>
                  <input
                    type="url"
                    value={form.twitter}
                    onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="https://twitter.com/..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white border border-neutral-200 p-6">
            <h2 className="font-medium text-[#1a1a1a] mb-4">Settings</h2>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  className="w-24 px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                  min="0"
                />
                <p className="text-xs text-neutral-500 mt-1">Lower numbers appear first</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#0055CC] border-neutral-300 focus:ring-[#0055CC]"
                />
                <span className="text-sm text-neutral-600">Active (visible on website)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex items-center gap-4 ml-auto">
              <Link
                href="/admin/team"
                className="px-6 py-3 border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#0055CC] text-white text-sm font-medium hover:bg-[#0044aa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Team Member'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
