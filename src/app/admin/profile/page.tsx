'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon } from '@hugeicons/core-free-icons'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useAdminUser } from '@/components/admin/AdminNav'

interface ProfileData {
  name: string
  email: string
  phone: string
  bio: string
  image: string | null
}

export default function ProfilePage() {
  const user = useAdminUser()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [form, setForm] = useState<ProfileData>({ name: '', email: '', phone: '', bio: '', image: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordForm, setPasswordForm] = useState({ current: '', newPassword: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [changingPassword, setChangingPassword] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetch('/api/staff/profile', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setForm(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Image must be under 5MB' })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setForm(f => ({ ...f, image: data.url }))
    } catch {
      setNotice({ type: 'error', text: 'Failed to upload image' })
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)

    try {
      const res = await fetch('/api/staff/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setProfile(data)
      setNotice({ type: 'success', text: 'Profile updated' })
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors({})
    setNotice(null)

    const errors: Record<string, string> = {}
    if (!passwordForm.current) errors.current = 'Enter your current password'
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 10) {
      errors.newPassword = 'New password must be at least 10 characters'
    }
    if (passwordForm.newPassword !== passwordForm.confirm) {
      errors.confirm = 'Passwords don\'t match'
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setChangingPassword(true)

    try {
      const res = await fetch('/api/staff/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      setPasswordForm({ current: '', newPassword: '', confirm: '' })
      setNotice({ type: 'success', text: 'Password changed successfully' })
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password' })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          <div className="skeleton h-8 w-48" />
          <div className="card card-body space-y-4">
            <div className="skeleton h-20 w-20 rounded-full" />
            <div className="skeleton h-11 w-full" />
            <div className="skeleton h-11 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="alert alert-error">Failed to load profile</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl font-light text-ink mb-6">Your Profile</h1>

      {notice && (
        <div className={`alert mb-6 ${notice.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {notice.text}
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={saveProfile} className="card card-body mb-8">
        <h2 className="text-lg font-medium text-ink mb-6">Profile Information</h2>

        {/* Photo */}
        <div className="form-field">
          <label className="form-label">Profile Photo</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full bg-neutral-100 overflow-hidden flex-shrink-0">
              {form.image ? (
                <Image src={form.image} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  <HugeiconsIcon icon={UserIcon} className="w-8 h-8" strokeWidth={1.7} aria-hidden="true" />
                </div>
              )}
            </div>
            <div>
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
                ) : form.image ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="form-helper">JPEG, PNG or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="form-field">
          <label htmlFor="name" className="form-label">Full Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="form-input"
          />
        </div>

        {/* Email */}
        <div className="form-field">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            disabled
            className="form-input bg-neutral-50"
          />
          <p className="form-helper">Contact a super admin to change your email</p>
        </div>

        {/* Phone */}
        <div className="form-field">
          <label htmlFor="phone" className="form-label">Phone Number</label>
          <input
            id="phone"
            type="tel"
            value={form.phone || ''}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="form-input"
            placeholder="+234 000 000 0000"
          />
        </div>

        {/* Bio */}
        <div className="form-field">
          <label htmlFor="bio" className="form-label">
            Bio <span className="form-label-optional">(optional)</span>
          </label>
          <textarea
            id="bio"
            value={form.bio || ''}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={3}
            className="form-input form-textarea"
            placeholder="A short description about yourself"
          />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn btn-lg btn-primary">
            {saving ? (
              <>
                <span className="spinner" />
                Saving...
              </>
            ) : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Password Change - Only for non-env users */}
      {user?.id !== 'env' && (
        <form onSubmit={changePassword} className="card card-body">
          <h2 className="text-lg font-medium text-ink mb-6">Change Password</h2>

          <div className="form-field">
            <label htmlFor="current" className="form-label">Current Password</label>
            <input
              id="current"
              type="password"
              value={passwordForm.current}
              onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
              className={`form-input ${passwordErrors.current ? 'form-input-error' : ''}`}
            />
            {passwordErrors.current && <p className="form-error">{passwordErrors.current}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="newPassword" className="form-label">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
              className={`form-input ${passwordErrors.newPassword ? 'form-input-error' : ''}`}
              placeholder="At least 10 characters"
            />
            {passwordErrors.newPassword && <p className="form-error">{passwordErrors.newPassword}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="confirm" className="form-label">Confirm New Password</label>
            <input
              id="confirm"
              type="password"
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              className={`form-input ${passwordErrors.confirm ? 'form-input-error' : ''}`}
            />
            {passwordErrors.confirm && <p className="form-error">{passwordErrors.confirm}</p>}
          </div>

          <div className="pt-2">
            <button type="submit" disabled={changingPassword} className="btn btn-lg btn-outline">
              {changingPassword ? (
                <>
                  <span className="spinner" />
                  Changing...
                </>
              ) : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
