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
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-medium text-ink mb-1">Create your account</h2>
          <p className="text-sm text-neutral-500 mb-6">Fill in your details to join as a staff member.</p>

          <form onSubmit={submit} className="space-y-5">
            {/* Profile Photo */}
            <div className="form-field">
              <label className="form-label">Profile photo</label>
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
                    className="btn btn-md btn-outline"
                  >
                    {uploading ? (
                      <>
                        <span className="spinner" />
                        Uploading...
                      </>
                    ) : image ? 'Change photo' : 'Upload photo'}
                  </button>
                  <p className="form-helper">JPEG, PNG or WebP. Max 5MB.</p>
                  {fields.image && <p className="form-error">{fields.image}</p>}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="form-field">
              <label htmlFor="name" className="form-label">Full name</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={`form-input ${fields.name ? 'form-input-error' : ''}`}
                placeholder="Your full name"
              />
              {fields.name && <p className="form-error">{fields.name}</p>}
            </div>

            {/* Email */}
            <div className="form-field">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={`form-input ${fields.email ? 'form-input-error' : ''}`}
                placeholder="you@example.com"
              />
              {fields.email && <p className="form-error">{fields.email}</p>}
            </div>

            {/* Phone */}
            <div className="form-field">
              <label htmlFor="phone" className="form-label">Phone number</label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={`form-input ${fields.phone ? 'form-input-error' : ''}`}
                placeholder="+234 000 000 0000"
              />
              {fields.phone && <p className="form-error">{fields.phone}</p>}
            </div>

            {/* Bio */}
            <div className="form-field">
              <label htmlFor="bio" className="form-label">
                Short bio <span className="form-label-optional">(optional)</span>
              </label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="form-input form-textarea"
                placeholder="A few words about yourself..."
              />
            </div>

            <div className="divider" />

            <div className="form-section">
              <p className="text-sm font-medium text-ink mb-4">Create a password for your account</p>

              {/* Password */}
              <div className="space-y-4">
                <div className="form-field">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`form-input ${fields.password ? 'form-input-error' : ''}`}
                    placeholder="At least 10 characters"
                  />
                  {fields.password && <p className="form-error">{fields.password}</p>}
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className={`form-input ${fields.confirmPassword ? 'form-input-error' : ''}`}
                    placeholder="Type your password again"
                  />
                  {fields.confirmPassword && <p className="form-error">{fields.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <button type="submit" disabled={busy} className="btn btn-lg btn-primary w-full">
              {busy ? (
                <>
                  <span className="spinner" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
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
