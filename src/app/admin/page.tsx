'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBrand } from '@/components/BrandProvider'
import { knownStaff, rememberStaff, forgetStaff, type KnownStaff } from '@/lib/staff-device'

export default function AdminLoginPage() {
  const router = useRouter()
  const brand = useBrand()
  const [known, setKnown] = useState<KnownStaff | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // A live session goes straight to the dashboard. People this browser has seen
  // before get the login form; everyone else is sent to the sign-up form.
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' })
        const data = await res.json()
        if (data.authenticated) {
          rememberStaff(data.user)
          router.replace('/admin/dashboard')
          return
        }
      } catch {
        // Not authenticated
      }
      const k = knownStaff()
      if (!k && !new URLSearchParams(window.location.search).has('login')) {
        router.replace('/admin/join')
        return
      }
      setKnown(k)
      if (k) setEmail(k.email)
      setChecking(false)
    }
    checkAuth()
  }, [router])

  const notMe = () => {
    forgetStaff()
    setKnown(null)
    setEmail('')
    setPassword('')
    setError('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      rememberStaff(data.user)
      router.replace('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  const firstName = known?.name.split(/\s+/)[0]

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-ink">
            {brand.name}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Staff Portal</p>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-medium text-ink mb-1">
            {known && firstName ? `Welcome back, ${firstName}` : 'Log in'}
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            {known ? 'Enter your password to continue.' : 'Use the email and password for your staff account.'}
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="form-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus={!!known}
                autoComplete="current-password"
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-lg btn-primary w-full"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Logging in...
                </>
              ) : (
                'Log in'
              )}
            </button>
          </form>

          {known && (
            <button type="button" onClick={notMe} className="block mx-auto mt-4 text-sm text-neutral-500 hover:text-ink">
              Not {firstName || known.email}? Use another account
            </button>
          )}
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          New here?{' '}
          <Link href="/admin/join" className="text-brand font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
