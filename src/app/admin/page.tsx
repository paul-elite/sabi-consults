'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBrand } from '@/components/BrandProvider'

export default function AdminLoginPage() {
  const router = useRouter()
  const brand = useBrand()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if already logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth')
        const data = await res.json()
        if (data.authenticated) {
          router.push('/admin/dashboard')
        }
      } catch {
        // Not authenticated
      } finally {
        setChecking(false)
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
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

      router.push('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
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

        {/* Login Form */}
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-medium text-ink mb-6">Sign in to continue</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Need access? Contact your administrator.
        </p>
      </div>
    </div>
  )
}
