'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SiteSettings {
  whatsapp_number: string
  phone_number: string
  email: string
  instagram_handle: string
  address: string
}

export default function AdminSettings() {
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

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Get auth token
      const authRes = await fetch('/api/auth')
      const authData = await authRes.json()

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
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
      {/* Admin Header */}
      <header className="bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin/dashboard" className="text-xl font-semibold">
              Sabi<span className="text-[#8b7355]">Consults</span>
              <span className="text-xs font-normal text-neutral-400 ml-2">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/" target="_blank" className="text-sm text-neutral-400 hover:text-white transition-colors">
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-light text-[#1a1a1a]">Site Settings</h1>
          <p className="text-neutral-500 mt-1">Manage your contact information and social links</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white border border-neutral-200">
          <div className="p-6 space-y-6">
            {/* WhatsApp Number */}
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="2348000000000"
                className="w-full px-4 py-3 border border-neutral-200 focus:border-[#8b7355] focus:outline-none transition-colors"
              />
              <p className="text-xs text-neutral-400 mt-1">
                Enter without + or spaces (e.g., 2348012345678)
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Phone Number (Display)
              </label>
              <input
                type="text"
                value={settings.phone_number}
                onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                placeholder="+234 800 000 0000"
                className="w-full px-4 py-3 border border-neutral-200 focus:border-[#8b7355] focus:outline-none transition-colors"
              />
              <p className="text-xs text-neutral-400 mt-1">
                This is how the phone number will be displayed on the site
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="hello@sabiconsults.com"
                className="w-full px-4 py-3 border border-neutral-200 focus:border-[#8b7355] focus:outline-none transition-colors"
              />
            </div>

            {/* Instagram Handle */}
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Instagram Handle
              </label>
              <div className="flex">
                <span className="px-4 py-3 bg-neutral-100 border border-r-0 border-neutral-200 text-neutral-500">
                  @
                </span>
                <input
                  type="text"
                  value={settings.instagram_handle}
                  onChange={(e) => setSettings({ ...settings, instagram_handle: e.target.value })}
                  placeholder="sabi_consults"
                  className="flex-1 px-4 py-3 border border-neutral-200 focus:border-[#8b7355] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Office Address
              </label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Abuja, Nigeria"
                rows={2}
                className="w-full px-4 py-3 border border-neutral-200 focus:border-[#8b7355] focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
