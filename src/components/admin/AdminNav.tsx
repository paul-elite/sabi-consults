'use client'

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Analytics01Icon, ArrowDown01Icon, Calendar03Icon, Cancel01Icon, ContactBookIcon, DashboardSquare01Icon, Globe02Icon, LinkSquare01Icon,
  Logout03Icon, Menu01Icon, News01Icon, PaintBoardIcon, Settings02Icon, UserCircleIcon, UserGroupIcon, UserLock01Icon,
} from '@hugeicons/core-free-icons'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
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

type NavLink = { href: string; label: string; min: AdminRole; icon: IconSvgElement; also?: string[] }
type NavGroup = { title: string; label: string; links: NavLink[] }

// Day-to-day work sits in the bar; configuration lives under the settings menu, personal items under the account menu.
const DASHBOARD: NavLink = { href: '/admin/dashboard', label: 'Dashboard', min: 'staff', icon: DashboardSquare01Icon, also: ['/admin/properties'] }
const OPERATIONS: NavLink[] = [
  { href: '/admin/leads', label: 'Leads', min: 'admin', icon: ContactBookIcon },
  { href: '/admin/analytics', label: 'Analytics', min: 'admin', icon: Analytics01Icon },
  { href: '/admin/visitors', label: 'Visitors', min: 'admin', icon: Globe02Icon },
]
const CONTENT: NavLink[] = [
  { href: '/admin/blog', label: 'Blog', min: 'staff', icon: News01Icon },
  { href: '/admin/content-planner', label: 'Planner', min: 'staff', icon: Calendar03Icon },
  { href: '/admin/team', label: 'Team', min: 'staff', icon: UserGroupIcon },
]
const MAIN: NavLink[] = [
  { href: '/admin/dashboard', label: 'Dashboard', min: 'staff', icon: DashboardSquare01Icon, also: ['/admin/properties'] },
  { href: '/admin/leads', label: 'Leads', min: 'admin', icon: ContactBookIcon },
  { href: '/admin/analytics', label: 'Analytics', min: 'admin', icon: Analytics01Icon },
  { href: '/admin/visitors', label: 'Visitors', min: 'admin', icon: Globe02Icon },
  { href: '/admin/blog', label: 'Blog', min: 'staff', icon: News01Icon },
  { href: '/admin/content-planner', label: 'Planner', min: 'staff', icon: Calendar03Icon },
  { href: '/admin/team', label: 'Team', min: 'staff', icon: UserGroupIcon },
]
const SETTINGS: NavLink[] = [
  { href: '/admin/settings', label: 'Site settings', min: 'admin', icon: Settings02Icon },
  { href: '/admin/branding', label: 'Branding', min: 'super_admin', icon: PaintBoardIcon },
  { href: '/admin/users', label: 'Staff accounts', min: 'super_admin', icon: UserLock01Icon },
]
const PROFILE: NavLink = { href: '/admin/profile', label: 'Your profile', min: 'staff', icon: UserCircleIcon }

const isActive = (pathname: string | null, l: NavLink) =>
  !!pathname && [l.href, ...(l.also ?? [])].some(h => pathname === h || pathname.startsWith(h + '/'))

/** Small popover menu that closes on outside click, Escape, or navigation. */
function Menu({ label, trigger, active, children }: { label: string; trigger: React.ReactNode; active: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={label}
        className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-sm transition-colors ${active || open ? 'bg-blue-50 text-[#0055cc]' : 'text-neutral-500 hover:text-ink hover:bg-neutral-100'}`}>
        {trigger}
        <HugeiconsIcon icon={ArrowDown01Icon} className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg shadow-neutral-900/5">
          {children}
        </div>
      )}
    </div>
  )
}

function MenuLink({ link, pathname }: { link: NavLink; pathname: string | null }) {
  const active = isActive(pathname, link)
  return (
    <Link href={link.href} role="menuitem" aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 px-3 h-10 rounded-lg text-sm transition-colors ${active ? 'bg-blue-50 text-[#0055cc] font-medium' : 'text-neutral-600 hover:bg-neutral-50 hover:text-ink'}`}>
      <HugeiconsIcon icon={link.icon} className="w-4 h-4 shrink-0" strokeWidth={1.7} aria-hidden="true" />
      {link.label}
    </Link>
  )
}

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

  const main = MAIN.filter(l => canAccess(user, l.min))
  const dashboard = canAccess(user, DASHBOARD.min) ? DASHBOARD : null
  const groups: NavGroup[] = [
    { title: 'Operations', label: 'Operations', links: OPERATIONS.filter(l => canAccess(user, l.min)) },
    { title: 'Content', label: 'Content', links: CONTENT.filter(l => canAccess(user, l.min)) },
  ].filter(g => g.links.length > 0)
  const settings = SETTINGS.filter(l => canAccess(user, l.min))
  const settingsActive = settings.some(l => isActive(pathname, l))
  const operationsActive = groups.some(g => g.title === 'Operations' && g.links.some(l => isActive(pathname, l)))
  const contentActive = groups.some(g => g.title === 'Content' && g.links.some(l => isActive(pathname, l)))
  const initials = user.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const signOut = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.replace('/admin')
  }

  const mobileGroup = (title: string, links: NavLink[]) => links.length > 0 && (
    <div className="py-2">
      <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">{title}</p>
      {links.map(l => <MenuLink key={l.href} link={l} pathname={pathname} />)}
    </div>
  )

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-neutral-50">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-neutral-200 pt-[env(safe-area-inset-top)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
            <Link href="/admin/dashboard" className="font-semibold whitespace-nowrap text-ink flex items-center gap-2">
              {brand.name}
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5">Admin</span>
            </Link>
            <span className="hidden lg:block w-px h-5 bg-neutral-200" aria-hidden="true" />
            <nav className="hidden lg:flex items-center gap-1 text-sm" aria-label="Admin">
              {dashboard && (
                <Link href={dashboard.href} aria-current={isActive(pathname, dashboard) ? 'page' : undefined}
                  className={`h-9 px-3 rounded-lg flex items-center gap-2 transition-colors ${isActive(pathname, dashboard) ? 'bg-blue-50 text-[#0055cc] font-medium' : 'text-neutral-500 hover:text-ink hover:bg-neutral-100'}`}>
                  <HugeiconsIcon icon={dashboard.icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  {dashboard.label}
                </Link>
              )}
              {groups.map(group => {
                const active = group.title === 'Operations' ? operationsActive : contentActive
                const icon = group.title === 'Operations' ? ContactBookIcon : News01Icon
                return (
                  <Menu key={group.title} label={`${group.title} menu`} active={active}
                    trigger={<><HugeiconsIcon icon={icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" /> {group.label}</>}>
                    <p className="px-3 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">{group.title}</p>
                    {group.links.map(l => <MenuLink key={l.href} link={l} pathname={pathname} />)}
                  </Menu>
                )
              })}
            </nav>
            <div className="ml-auto hidden lg:flex items-center gap-1 text-sm">
              <Link href="/" target="_blank" className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-neutral-500 hover:text-ink hover:bg-neutral-100 transition-colors">
                View site <HugeiconsIcon icon={LinkSquare01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
              </Link>
              {settings.length > 0 && (
                <Menu label="Settings" active={settingsActive}
                  trigger={<HugeiconsIcon icon={Settings02Icon} className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden="true" />}>
                  <p className="px-3 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Settings</p>
                  {settings.map(l => <MenuLink key={l.href} link={l} pathname={pathname} />)}
                </Menu>
              )}
              <Menu label="Account" active={isActive(pathname, PROFILE)}
                trigger={<span className="w-7 h-7 rounded-full bg-[#0055cc] text-white text-[11px] font-semibold grid place-items-center">{initials}</span>}>
                <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                  <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                  <p className="text-xs text-neutral-400 truncate">{user.email} · {roleLabel(user.role)}</p>
                </div>
                <MenuLink link={PROFILE} pathname={pathname} />
                <button type="button" role="menuitem" onClick={signOut}
                  className="w-full flex items-center gap-2.5 px-3 h-10 rounded-lg text-sm text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <HugeiconsIcon icon={Logout03Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  Sign out
                </button>
              </Menu>
            </div>
            <button className="ml-auto lg:hidden w-11 h-11 grid place-items-center text-neutral-600" onClick={() => setOpen(o => !o)}
              aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
              <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
          {open && (
            <nav className="lg:hidden border-t border-neutral-100 px-2 pb-4 pb-safe bg-white divide-y divide-neutral-100 max-h-[calc(100dvh-3.5rem)] overflow-y-auto" aria-label="Admin mobile">
              {mobileGroup('Workspace', main)}
              {mobileGroup('Settings', settings)}
              <div className="py-2">
                <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">Account</p>
                <MenuLink link={PROFILE} pathname={pathname} />
                <Link href="/" target="_blank" className="flex items-center gap-2.5 px-3 h-10 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50">
                  <HugeiconsIcon icon={LinkSquare01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  View site
                </Link>
                <div className="mt-3 px-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-neutral-600 truncate">{user.name} · {roleLabel(user.role)}</span>
                  <button onClick={signOut} className="shrink-0 px-4 h-10 bg-neutral-100 text-neutral-700 rounded-lg">Sign out</button>
                </div>
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
