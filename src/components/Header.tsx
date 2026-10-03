'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Menu01Icon, WhatsappIcon } from '@hugeicons/core-free-icons'

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
              <HugeiconsIcon icon={WhatsappIcon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
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
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
              ) : (
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
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
