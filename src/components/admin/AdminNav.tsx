'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Menu01Icon, PaintBoardIcon, LinkSquare01Icon } from '@hugeicons/core-free-icons'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useBrand } from '../BrandProvider'

export type AdminRole = 'super_admin' | 'admin' | 'staff'
export interface AdminUser { id: string; email: string; name: string; role: AdminRole }

const RANK: Record<AdminRole, number> = { staff: 1, admin: 2, super_admin: 3 }
export const roleLabel = (r: AdminRole) => ({ super_admin: 'Super admin', admin: 'Admin', staff: 'Staff' }[r])

const UserContext = createContext<AdminUser | null>(null)
export const useAdminUser = () => useContext(UserContext)
export const canAccess = (u: AdminUser | null, min: AdminRole) => !!u && RANK[u.role] >= RANK[min]

const LINKS: { href: string; label: string; min: AdminRole; icon?: boolean }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', min: 'staff' },
  { href: '/admin/analytics', label: 'Analytics', min: 'admin' },
  { href: '/admin/leads', label: 'Leads', min: 'admin' },
  { href: '/admin/blog', label: 'Blog', min: 'staff' },
  { href: '/admin/team', label: 'Team', min: 'staff' },
  { href: '/admin/settings', label: 'Settings', min: 'admin' },
  { href: '/admin/users', label: 'Staff accounts', min: 'super_admin' },
  { href: '/admin/profile', label: 'Profile', min: 'staff' },
]

// Branding is shown as a settings gear icon, not in the main nav
const BRANDING_LINK = { href: '/admin/branding', label: 'Branding', min: 'super_admin' as AdminRole }

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const brand = useBrand()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [checked, setChecked] = useState(false)
  const [open, setOpen] = useState(false)
  const isLogin = pathname === '/admin'

  useEffect(() => {
    let alive = true
    fetch('/api/auth', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        setUser(d.authenticated ? d.user : null)
        setChecked(true)
        if (!d.authenticated && !isLogin) router.replace('/admin')
      })
      .catch(() => { setChecked(true); if (!isLogin) router.replace('/admin') })
    return () => { alive = false }
  }, [pathname, isLogin, router])

  useEffect(() => setOpen(false), [pathname])

  if (isLogin) return <>{children}</>
  if (!checked || !user) {
    return <div className="min-h-screen grid place-items-center text-neutral-400 animate-pulse">Loading…</div>
  }

  const links = LINKS.filter(l => canAccess(user, l.min))
  const signOut = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.replace('/admin')
  }

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-neutral-50">
        <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 pt-[env(safe-area-inset-top)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
            <Link href="/admin/dashboard" className="font-semibold whitespace-nowrap text-ink">
              {brand.name} <span className="text-xs font-normal text-neutral-400 ml-1">Admin</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1 text-sm" aria-label="Admin">
              {links.map(l => (
                <Link key={l.href} href={l.href} aria-current={pathname?.startsWith(l.href) ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${pathname?.startsWith(l.href) ? 'bg-blue-50 text-[#0055cc] font-medium' : 'text-neutral-500 hover:text-ink hover:bg-neutral-50'}`}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto hidden lg:flex items-center gap-4 text-sm">
              <Link href="/" target="_blank" className="text-neutral-500 hover:text-ink">View site <HugeiconsIcon icon={LinkSquare01Icon} className="inline w-4 h-4" aria-hidden="true" /></Link>
              {canAccess(user, BRANDING_LINK.min) && (
                <Link
                  href={BRANDING_LINK.href}
                  aria-current={pathname?.startsWith(BRANDING_LINK.href) ? 'page' : undefined}
                  aria-label="Branding settings"
                  title="Branding"
                  className={`w-9 h-9 rounded-lg grid place-items-center transition-colors ${pathname?.startsWith(BRANDING_LINK.href) ? 'bg-blue-50 text-[#0055cc]' : 'text-neutral-400 hover:text-ink hover:bg-neutral-100'}`}
                >
                  <HugeiconsIcon icon={PaintBoardIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
                </Link>
              )}
              <span className="w-px h-4 bg-neutral-200" />
              <span className="text-neutral-600">{user.name} <span className="text-neutral-400">· {roleLabel(user.role)}</span></span>
              <button onClick={signOut} className="px-3 py-1.5 text-neutral-500 hover:text-ink hover:bg-neutral-100 rounded-lg transition-colors">Sign out</button>
            </div>
            <button className="ml-auto lg:hidden w-11 h-11 grid place-items-center text-neutral-600" onClick={() => setOpen(o => !o)}
              aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
              <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
          {open && (
            <nav className="lg:hidden border-t border-neutral-100 px-4 pb-4 pb-safe bg-white" aria-label="Admin mobile">
              {links.map(l => (
                <Link key={l.href} href={l.href} aria-current={pathname?.startsWith(l.href) ? 'page' : undefined} className={`block py-3 border-b border-neutral-100 ${pathname?.startsWith(l.href) ? 'text-[#0055cc] font-medium' : 'text-neutral-600'}`}>{l.label}</Link>
              ))}
              {canAccess(user, BRANDING_LINK.min) && (
                <Link href={BRANDING_LINK.href} aria-current={pathname?.startsWith(BRANDING_LINK.href) ? 'page' : undefined} className={`flex items-center gap-2 py-3 border-b border-neutral-100 ${pathname?.startsWith(BRANDING_LINK.href) ? 'text-[#0055cc] font-medium' : 'text-neutral-600'}`}>
                  <HugeiconsIcon icon={PaintBoardIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  Branding
                </Link>
              )}
              <Link href="/" target="_blank" className="block py-3 border-b border-neutral-100 text-neutral-600">View site <HugeiconsIcon icon={LinkSquare01Icon} className="inline w-4 h-4" aria-hidden="true" /></Link>
              <div className="pt-4 flex items-center justify-between text-sm">
                <span className="text-neutral-600">{user.name} · {roleLabel(user.role)}</span>
                <button onClick={signOut} className="px-4 h-10 bg-neutral-100 text-neutral-700 rounded-lg">Sign out</button>
              </div>
            </nav>
          )}
        </header>
        {children}
      </div>
    </UserContext.Provider>
  )
}

/** Wrap a page that needs a minimum role. */
export function RequireRole({ min, children }: { min: AdminRole; children: React.ReactNode }) {
  const user = useAdminUser()
  if (canAccess(user, min)) return <>{children}</>
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-light text-ink mb-2">You don’t have access to this page</h1>
      <p className="text-neutral-500 mb-6">Only a {roleLabel(min).toLowerCase()} can open it. Ask a super admin if you need access.</p>
      <Link href="/admin/dashboard" className="rounded-lg inline-block px-5 py-3 bg-brand text-on-brand">Back to dashboard</Link>
    </div>
  )
}
