'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Cancel01Icon, Menu01Icon, WhatsappIcon } from '@hugeicons/core-free-icons'
import Logo from './Logo'
import StickerIcon, { type StickerName } from './StickerIcon'
import { useBrand, useSiteSettings } from './BrandProvider'

type NavItem = { href: string; label: string; hint: string; icon: StickerName; isNew?: boolean }

// Grouped by what a visitor is trying to do
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Find a property',
    items: [
      { href: '/', label: 'Home', hint: 'Featured listings and search', icon: 'home' },
      { href: '/properties', label: 'Properties', hint: 'Browse houses and land', icon: 'listings' },
      { href: '/map', label: 'Map', hint: 'Search by district', icon: 'map' },
    ],
  },
  {
    title: 'Learn',
    items: [
      { href: '/realtypedia', label: 'Realtypedia', hint: 'Property terms in plain words', icon: 'guides', isNew: true },
      { href: '/resources', label: 'Resources', hint: 'Forms and checklists', icon: 'documents' },
      { href: '/blog', label: 'Blog', hint: 'Market news and guides', icon: 'insights' },
    ],
  },
  {
    title: 'Work with us',
    items: [
      { href: '/services', label: 'Services', hint: 'Buying, selling and advice', icon: 'verified' },
      { href: '/about', label: 'About', hint: 'Our team and story', icon: 'clients' },
      { href: '/contact', label: 'Contact', hint: 'Call, email or visit', icon: 'call' },
    ],
  },
]

// Shown inline on wide screens; everything stays in the menu too
const PRIMARY = ['/properties', '/map', '/services', '/realtypedia', '/blog', '/about']
const ALL = GROUPS.flatMap(g => g.items)
const CLOSE_MS = 280

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

export default function Header() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false) // drives the enter/exit transition
  const [scrolled, setScrolled] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef(0)
  const pathname = usePathname()
  const brand = useBrand()
  const settings = useSiteSettings()
  const titleId = useId()
  const digits = settings.whatsapp_number.replace(/\D/g, '')

  const openMenu = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const closeMenu = useCallback((immediate = false) => {
    setVisible(false)
    window.clearTimeout(closeTimer.current)
    const finish = () => setOpen(false)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (immediate || reduce) finish()
    else closeTimer.current = window.setTimeout(finish, CLOSE_MS)
  }, [])

  // Show or hide the native modal; it traps focus and makes the page behind it inert
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      requestAnimationFrame(() => setVisible(true))
    } else if (!open && el.open) {
      el.close()
      trigger.current?.focus()
    }
  }, [open])

  // Lock page scroll without the layout jumping when the scrollbar disappears
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const gap = window.innerWidth - root.clientWidth
    const prev = { overflow: root.style.overflow, padding: root.style.paddingRight }
    root.style.overflow = 'hidden'
    if (gap > 0) root.style.paddingRight = `${gap}px`
    return () => { root.style.overflow = prev.overflow; root.style.paddingRight = prev.padding }
  }, [open])

  // Navigating closes the menu straight away
  useEffect(() => { closeMenu(true) }, [pathname, closeMenu])
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 8))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll) }
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-[1100] pt-[calc(env(safe-area-inset-top)+0.75rem)] pointer-events-none">
      <a
        href="#main-content"
        className="pointer-events-auto sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-on-brand focus:shadow-lg"
      >
        Skip to main content
      </a>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main">
        <div
          className={`pointer-events-auto w-full min-h-14 rounded-3xl pl-5 pr-2 py-2 border flex items-center gap-4 text-ink backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300 motion-reduce:transition-none ${
            scrolled ? 'bg-white/95 border-neutral-200 shadow-md shadow-neutral-900/5' : 'bg-white/90 border-white/70 shadow-sm'
          }`}
        >
          <Link href="/" className="flex items-center min-h-11 shrink-0 rounded-lg" aria-label={`${brand.name} home`}>
            <Logo onDark={false} className="h-7 lg:h-9 w-auto brightness-0" />
          </Link>

          <ul className="hidden xl:flex items-center gap-0.5 ml-auto text-sm">
            {PRIMARY.map(href => {
              const item = ALL.find(i => i.href === href)!
              const active = isActive(pathname, href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative inline-flex items-center gap-1.5 h-11 px-3 rounded-xl font-medium transition-colors ${
                      active ? 'text-brand' : 'text-neutral-600 hover:text-ink hover:bg-neutral-100'
                    }`}
                  >
                    {item.label}
                    {item.isNew && <span className="rounded-full bg-brand-soft text-brand text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5">New</span>}
                    {/* Shape as well as colour marks the current page */}
                    {active && <span className="absolute left-3 right-3 bottom-1.5 h-0.5 rounded-full bg-brand" aria-hidden="true" />}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="ml-auto xl:ml-2 flex items-center gap-1.5">
            <span className="hidden sm:inline-flex"><Link href="/contact" className="btn btn-md btn-brand rounded-2xl">Book an inspection</Link></span>
            <button
              ref={trigger}
              type="button"
              onClick={openMenu}
              className="w-11 h-11 grid place-items-center rounded-full text-ink transition-colors hover:bg-brand-soft"
              aria-haspopup="dialog"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="site-menu"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      <dialog
        ref={dialog}
        id="site-menu"
        aria-labelledby={titleId}
        onCancel={event => { event.preventDefault(); closeMenu() }}
        onClick={event => { if (event.target === event.currentTarget) closeMenu() }}
        data-visible={visible || undefined}
        className="site-menu pointer-events-auto fixed inset-0 m-0 ml-auto w-full max-w-none sm:max-w-md h-dvh max-h-none bg-white text-ink p-0 overflow-y-auto overscroll-contain shadow-2xl"
      >
        <div className="min-h-full flex flex-col px-5 sm:px-7 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="h-14 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 id={titleId} className="sr-only">Menu</h2>
            <span aria-hidden="true" />
            <button
              type="button"
              onClick={() => closeMenu()}
              aria-label="Close menu"
              className="w-11 h-11 grid place-items-center rounded-full border border-neutral-200 text-ink hover:bg-neutral-100 transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="All pages" className="mt-2 grid gap-6">
            {GROUPS.map((group, g) => (
              <section key={group.title} aria-labelledby={`${titleId}-g${g}`}>
                <h3 id={`${titleId}-g${g}`} className="px-2 mb-1 text-xs font-medium uppercase tracking-wider text-neutral-400">{group.title}</h3>
                <ul className="grid">
                  {group.items.map((item, i) => {
                    const active = isActive(pathname, item.href)
                    return (
                      <li key={item.href} className="menu-item" style={{ '--i': g * 3 + i } as React.CSSProperties}>
                        <Link
                          href={item.href}
                          onClick={() => closeMenu()}
                          aria-current={active ? 'page' : undefined}
                          className="group flex items-center gap-3 min-h-12 px-2 py-1.5 rounded-2xl transition-colors hover:bg-neutral-50"
                        >
                          <StickerIcon name={item.icon} size={36} className={active ? '' : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition'} />
                          <span className="min-w-0 flex-1">
                            <span className={`flex items-center gap-2 text-lg font-medium leading-tight ${active ? 'text-ink' : 'text-neutral-500 group-hover:text-ink'}`}>
                              {item.label}
                              {item.isNew && <span className="rounded-full bg-brand text-on-brand text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5">New</span>}
                              {active && <span className="sr-only">(current page)</span>}
                            </span>
                          </span>
                          <HugeiconsIcon icon={ArrowRight01Icon} className={`w-4 h-4 shrink-0 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5 ${active ? 'text-ink' : 'text-neutral-300'}`} strokeWidth={1.8} aria-hidden="true" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </nav>

          <div className="mt-auto pt-8 grid gap-3">
            <Link href="/contact" onClick={() => closeMenu()} className="btn btn-lg btn-brand w-full">Book an inspection</Link>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="btn btn-lg btn-secondary w-full">
              <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              Chat on WhatsApp
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="text-center text-sm text-neutral-500">
              Or call <a href={`tel:+${digits}`} className="font-medium text-ink underline decoration-neutral-300 underline-offset-2 hover:decoration-brand">{settings.phone_number}</a>
            </p>
          </div>
        </div>
      </dialog>
    </header>
  )
}
