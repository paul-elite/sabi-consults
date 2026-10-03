
import { HugeiconsIcon } from '@hugeicons/react'
import { InstagramIcon, WhatsappIcon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { getBrand } from '@/lib/brand'
import { getSettings } from '@/lib/settings'

export default async function Footer() {
  const [brand, settings] = await Promise.all([getBrand(), getSettings()])
  const wa = `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`
  const tel = `tel:+${settings.whatsapp_number.replace(/\D/g, '')}`
  return (
    <footer className="bg-brand text-on-brand">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16 pb-safe">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt={brand.name} className="h-10 w-auto" />
              ) : (
                <span className="font-heading text-2xl">{brand.name}</span>
              )}
            </Link>
            <p className="mt-4 text-on-brand/70 text-sm leading-relaxed">
              {brand.tagline}
            </p>
            {/* Social Links */}
            <div className="flex items-center space-x-4 mt-6">
              <a
                href={`https://instagram.com/${settings.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-brand/70 hover:text-on-brand transition-colors"
                aria-label="Instagram"
              >
                <HugeiconsIcon icon={InstagramIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              </a>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-brand/70 hover:text-on-brand transition-colors"
                aria-label="WhatsApp"
              >
                <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Navigation</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="inline-block py-0.5 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/properties" className="inline-block py-0.5 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Properties
                </Link>
              </li>
              <li>
                <Link href="/services" className="inline-block py-0.5 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/resources" className="inline-block py-0.5 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <Link href="/about" className="inline-block py-0.5 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-block py-0.5 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/services#sales" className="inline-block py-1 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Property Sales
                </Link>
              </li>
              <li>
                <Link href="/services#acquisition" className="inline-block py-1 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Property Acquisition
                </Link>
              </li>
              <li>
                <Link href="/services#consulting" className="inline-block py-1 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Real Estate Consulting
                </Link>
              </li>
              <li>
                <Link href="/services#investment" className="inline-block py-1 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  Investment Advisory
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="text-on-brand/70 text-sm">
                {settings.address}
              </li>
              <li>
                <a href={tel} className="inline-block py-1 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  {settings.phone_number}
                </a>
              </li>
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block py-1 text-on-brand/70 hover:text-on-brand text-sm transition-colors">
                  WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-on-brand/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-on-brand/50 text-sm">
              &copy; {new Date().getFullYear()} {brand.name}. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="text-on-brand/50 hover:text-on-brand/70 text-sm transition-colors">
                Staff Access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
