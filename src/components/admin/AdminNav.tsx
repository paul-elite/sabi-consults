'use client'

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

const LINKS: { href: string; label: string; min: AdminRole }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', min: 'staff' },
  { href: '/admin/blog', label: 'Blog', min: 'staff' },
  { href: '/admin/team', label: 'Team', min: 'staff' },
  { href: '/admin/settings', label: 'Contact settings', min: 'admin' },
  { href: '/admin/branding', label: 'Branding', min: 'super_admin' },
  { href: '/admin/users', label: 'Staff accounts', min: 'super_admin' },
]

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
      <header className="sticky top-0 z-50 bg-ink text-white pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
          <Link href="/admin/dashboard" className="font-semibold whitespace-nowrap">
            {brand.name} <span className="text-xs font-normal text-white/50 ml-1">Admin</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-5 text-sm" aria-label="Admin">
            {links.map(l => (
              <Link key={l.href} href={l.href} aria-current={pathname?.startsWith(l.href) ? 'page' : undefined}
                className={pathname?.startsWith(l.href) ? 'text-white' : 'text-white/60 hover:text-white'}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden lg:flex items-center gap-4 text-sm">
            <Link href="/" target="_blank" className="text-white/60 hover:text-white">View site</Link>
            <span className="text-white/40">|</span>
            <span className="text-white/80">{user.name} <span className="text-white/50">({roleLabel(user.role)})</span></span>
            <button onClick={signOut} className="text-white/60 hover:text-white">Sign out</button>
          </div>
          <button className="ml-auto lg:hidden w-11 h-11 grid place-items-center" onClick={() => setOpen(o => !o)}
            aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={1.75} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
        </div>
        {open && (
          <nav className="lg:hidden border-t border-white/10 px-4 pb-4 pb-safe" aria-label="Admin mobile">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="block py-3 border-b border-white/10 text-white/85">{l.label}</Link>
            ))}
            <Link href="/" target="_blank" className="block py-3 border-b border-white/10 text-white/85">View site</Link>
            <div className="pt-4 flex items-center justify-between text-sm">
              <span className="text-white/70">{user.name}, {roleLabel(user.role)}</span>
              <button onClick={signOut} className="px-4 h-10 border border-white/30">Sign out</button>
            </div>
          </nav>
        )}
      </header>
      {children}
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
      <Link href="/admin/dashboard" className="inline-block px-5 py-3 bg-brand text-on-brand">Back to dashboard</Link>
    </div>
  )
}
