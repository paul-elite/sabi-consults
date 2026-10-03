'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import Logo from './Logo'
import { useBrand } from './BrandProvider'

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
  const dialog = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()
  const brand = useBrand()
  const onDark = pathname === '/'

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const element = dialog.current
    if (open) element?.showModal()
    else element?.close()
    const previous = document.body.style.overflow
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  return (
    <header className={`absolute inset-x-0 top-0 z-[1100] pt-[env(safe-area-inset-top)] ${onDark ? 'text-white' : 'text-ink'}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20" aria-label="Main">
        <Link href="/" className="flex items-center min-h-11" aria-label={`${brand.name} home`}>
          <Logo onDark={onDark} className={`h-8 lg:h-10 w-auto ${onDark ? 'brightness-0 invert' : 'brightness-0'}`} />
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="w-12 h-12 grid place-items-center rounded-lg hover:bg-current/10" aria-label="Open menu" aria-expanded={open} aria-controls="site-menu">
          <HugeiconsIcon icon={Menu01Icon} className="w-7 h-7" strokeWidth={1.7} aria-hidden="true" />
        </button>
      </nav>
      <dialog ref={dialog} id="site-menu" aria-label="Site navigation" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} className="fixed inset-0 m-0 w-full max-w-none h-dvh max-h-none bg-white text-ink p-0 backdrop:bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top)]">
          <div className="h-16 lg:h-20 flex items-center justify-between">
            <Link href="/" onClick={() => setOpen(false)} aria-label={`${brand.name} home`}><Logo onDark={false} className="h-8 lg:h-10 w-auto brightness-0" /></Link>
            <button type="button" onClick={() => setOpen(false)} className="w-12 h-12 grid place-items-center rounded-lg hover:bg-brand-soft" aria-label="Close menu">
              <HugeiconsIcon icon={Cancel01Icon} className="w-7 h-7" strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Site pages" className="grid sm:grid-cols-2 gap-x-12 py-6">
            {NAV.map(item => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`font-heading text-2xl sm:text-3xl font-semibold py-4 border-b border-blue-100 hover:text-brand ${active ? 'text-brand' : 'text-ink'}`}>{item.label}</Link>
            })}
          </nav>
          <Link href="/contact" onClick={() => setOpen(false)} className="btn btn-lg btn-brand mb-8">Book an inspection</Link>
        </div>
      </dialog>
    </header>
  )
}
