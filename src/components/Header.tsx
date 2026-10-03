'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'
import { useBrand, useSiteSettings } from './BrandProvider'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/properties', label: 'Properties' },
  { href: '/map', label: 'Map' },
  { href: '/services', label: 'Services' },
  { href: '/resources', label: 'Resources' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const brand = useBrand()
  const settings = useSiteSettings()
  const digits = settings.whatsapp_number.replace(/\D/g, '')

  // Close the menu when the page changes, and stop the page scrolling behind it
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href))

  return (
    <header className="fixed top-0 left-0 right-0 z-[1100] bg-brand text-on-brand border-b border-brand-dark pt-[env(safe-area-inset-top)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center min-h-11" aria-label={`${brand.name} home`}>
            <Logo className="h-8 lg:h-10 w-auto" />
          </Link>

          <div className="hidden lg:flex items-center gap-9">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`text-sm font-medium transition-colors relative py-1 select-none ${isActive(item.href) ? 'text-on-brand after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:bg-on-brand' : 'text-on-brand/75 hover:text-on-brand'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center">
            <Link href="/contact" className="px-6 py-2.5 bg-white text-brand text-sm font-medium rounded-lg hover:bg-white/90 transition-colors">
              Book an inspection
            </Link>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <a
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 grid place-items-center text-on-brand"
              aria-label="Chat on WhatsApp"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.2 0-5.4 4.4-9.8 9.8-9.8 2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.2.1 12 .1 5.5.1.2 5.4.2 11.9c0 2.1.5 4.1 1.6 5.9L.1 24l6.3-1.7c1.7.9 3.7 1.4 5.6 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.3z"/></svg>
            </a>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="w-11 h-11 grid place-items-center text-on-brand"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={1.75} d="M4 7h16M4 12h16M4 17h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu: full screen below the bar */}
      <div
        id="mobile-menu"
        className={`lg:hidden fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] bg-brand overflow-y-auto transition-[opacity,visibility] duration-200 ${open ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      >
        <div className="px-4 sm:px-6 py-4 flex flex-col min-h-full">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`font-heading text-2xl py-4 border-b border-on-brand/15 ${isActive(item.href) ? 'text-on-brand' : 'text-on-brand/80'}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-auto pt-8 grid grid-cols-2 gap-3 pb-safe">
            <a href={`tel:+${digits}`} className="h-12 grid place-items-center border border-on-brand/40 text-on-brand font-medium rounded-lg">
              Call us
            </a>
            <Link href="/contact" className="h-12 grid place-items-center bg-white text-brand font-medium rounded-lg">
              Book inspection
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
