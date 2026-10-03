'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useBrand } from '@/components/BrandProvider'

export default function JoinPage() {
  const brand = useBrand()
  const [form, setForm] = useState({ name: '', email: '', phone: '', bio: '', password: '', confirmPassword: '' })
  const [image, setImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setFields(f => ({ ...f, image: 'Image must be under 5MB' }))
      return
    }

    setUploading(true)
    setFields(f => ({ ...f, image: '' }))

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setImage(data.url)
    } catch {
      setFields(f => ({ ...f, image: 'Failed to upload image. Try again.' }))
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFields({})
    setError('')
    setBusy(true)

    try {
      const res = await fetch('/api/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, image }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.fields) setFields(data.fields)
        setError(data.error || 'Registration failed')
        setBusy(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-ink mb-2">Account created</h1>
          <p className="text-neutral-600 mb-8">
            Your staff account has been set up. You can now sign in with your email and password.
          </p>
          <Link
            href="/admin"
            className="inline-flex h-12 px-8 items-center justify-center bg-ink text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-ink">{brand.name}</h1>
          <p className="text-sm text-neutral-500 mt-1">Join the team</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-6 sm:p-8">
          <h2 className="text-lg font-medium text-ink mb-1">Create your account</h2>
          <p className="text-sm text-neutral-500 mb-6">Fill in your details to join as a staff member.</p>

          <form onSubmit={submit} className="space-y-5">
            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Profile photo</label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full bg-neutral-100 overflow-hidden flex-shrink-0">
                  {image ? (
                    <Image src={image} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : image ? 'Change photo' : 'Upload photo'}
                  </button>
                  <p className="text-xs text-neutral-400 mt-1">JPEG, PNG or WebP. Max 5MB.</p>
                  {fields.image && <p className="text-xs text-red-600 mt-1">{fields.image}</p>}
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={`w-full h-11 px-4 bg-neutral-50 border ${fields.name ? 'border-red-400' : 'border-neutral-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors`}
                placeholder="Your full name"
              />
              {fields.name && <p className="text-xs text-red-600 mt-1">{fields.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={`w-full h-11 px-4 bg-neutral-50 border ${fields.email ? 'border-red-400' : 'border-neutral-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors`}
                placeholder="you@example.com"
              />
              {fields.email && <p className="text-xs text-red-600 mt-1">{fields.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={`w-full h-11 px-4 bg-neutral-50 border ${fields.phone ? 'border-red-400' : 'border-neutral-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors`}
                placeholder="+234 000 000 0000"
              />
              {fields.phone && <p className="text-xs text-red-600 mt-1">{fields.phone}</p>}
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Short bio <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none"
                placeholder="A few words about yourself..."
              />
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <p className="text-sm text-neutral-600 mb-4">Create a password for your account</p>

              {/* Password */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`w-full h-11 px-4 bg-neutral-50 border ${fields.password ? 'border-red-400' : 'border-neutral-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors`}
                    placeholder="At least 10 characters"
                  />
                  {fields.password && <p className="text-xs text-red-600 mt-1">{fields.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className={`w-full h-11 px-4 bg-neutral-50 border ${fields.confirmPassword ? 'border-red-400' : 'border-neutral-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors`}
                    placeholder="Type your password again"
                  />
                  {fields.confirmPassword && <p className="text-xs text-red-600 mt-1">{fields.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 bg-ink text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{' '}
          <Link href="/admin" className="text-brand font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
