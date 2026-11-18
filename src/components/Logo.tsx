'use client'

import { useBrand } from './BrandProvider'

/**
 * The brand logo, or the brand name in type when no logo is set.
 * `onDark` picks the logo meant for brand-coloured backgrounds. On light
 * backgrounds we use the dedicated dark artwork; if none has been uploaded we
 * fall back to the main logo silhouetted to black so it stays legible.
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
  const silhouette = !onDark && !brand.logoDarkUrl
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={brand.name} className={`${className}${silhouette ? ' brightness-0' : ''}`} />
}
