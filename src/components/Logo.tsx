'use client'

import { useBrand } from './BrandProvider'

/**
 * The brand logo, or the brand name in type when no logo is set.
 * `onDark` picks the logo meant for brand-coloured backgrounds.
 */
export default function Logo({ onDark = true, className = 'h-9 w-auto' }: { onDark?: boolean; className?: string }) {
  const brand = useBrand()
  const src = onDark ? brand.logoUrl : brand.logoDarkUrl || brand.logoUrl
  if (!src) {
    return (
      <span className={`font-heading text-xl tracking-tight ${onDark ? 'text-on-brand' : 'text-ink'}`}>
        {brand.name}
      </span>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={brand.name} className={className} />
}
