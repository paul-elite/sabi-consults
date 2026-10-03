'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'

interface SiteSettings {
  whatsapp_number: string
  phone_number: string
  email: string
  instagram_handle: string
  address: string
}

function AdminSettingsInner() {
  const router = useRouter()
  const [settings, setSettings] = useState<SiteSettings>({
    whatsapp_number: '',
    phone_number: '',
    email: '',
    instagram_handle: '',
    address: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        // Check auth
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.authenticated) {
          router.push('/admin')
          return
        }

        // Fetch settings
        const settingsRes = await fetch('/api/settings')
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
      } catch {
        console.error('Failed to fetch settings')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router])


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        throw new Error('Failed to save')
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Settings Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-light text-ink">Contact Settings</h1>
          <p className="text-neutral-500 mt-1">Manage your contact information and social links</p>
        </div>

        {message && (
          <div className={`alert mb-6 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="card">
          <div className="card-body space-y-6">
            {/* WhatsApp Number */}
            <div className="form-field">
              <label className="form-label">WhatsApp Number</label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="2348000000000"
                className="form-input"
              />
              <p className="form-helper">
                Enter without + or spaces (e.g., 2348012345678)
              </p>
            </div>

            {/* Phone Number */}
            <div className="form-field">
              <label className="form-label">Phone Number (Display)</label>
              <input
                type="text"
                value={settings.phone_number}
                onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                placeholder="+234 800 000 0000"
                className="form-input"
              />
              <p className="form-helper">
                This is how the phone number will be displayed on the site
              </p>
            </div>

            {/* Email */}
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="hello@sabiconsults.com"
                className="form-input"
              />
            </div>

            {/* Instagram Handle */}
            <div className="form-field">
              <label className="form-label">Instagram Handle</label>
              <div className="flex">
                <span className="flex items-center px-4 bg-neutral-100 border border-r-0 border-neutral-200 text-neutral-500 rounded-l-lg">
                  @
                </span>
                <input
                  type="text"
                  value={settings.instagram_handle}
                  onChange={(e) => setSettings({ ...settings, instagram_handle: e.target.value })}
                  placeholder="sabi_consults"
                  className="form-input rounded-l-none"
                />
              </div>
            </div>

            {/* Address */}
            <div className="form-field">
              <label className="form-label">Office Address</label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Abuja, Nigeria"
                rows={2}
                className="form-input form-textarea"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="card-footer flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-md btn-primary"
            >
              {saving ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function AdminSettings() {
  return <RequireRole min="admin"><AdminSettingsInner /></RequireRole>
}
