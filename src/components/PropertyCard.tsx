import Link from 'next/link'
import Image from 'next/image'
import { Property } from '@/lib/types'
import { priceHeadline, propertyFacts } from '@/lib/format'

interface PropertyCardProps {
  property: Property
  variant?: 'default' | 'featured'
  priority?: boolean
}

export default function PropertyCard({ property, variant = 'default', priority = false }: PropertyCardProps) {
  const { amount, label } = priceHeadline(property)
  const facts = propertyFacts(property)
  const options = property.variations?.length || 0
  const isLand = property.type === 'land'

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block rounded-xl focus-visible:outline-offset-4"
      aria-label={`${property.title}, ${property.district}. ${label} ${amount}`}
    >
      <div className={`relative overflow-hidden rounded-xl bg-brand-soft ${variant === 'featured' ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-[3/2]'}`}>
        {/* Placeholder shown behind the photo (and if it fails to load) */}
        <svg className="absolute inset-0 m-auto w-10 h-10 text-brand/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />
        </svg>
        {property.images[0] && (
          <Image
            src={property.images[0]}
            alt=""
            fill
            priority={priority}
            className="object-cover text-transparent transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-white/95 text-ink text-xs font-medium shadow-sm">
            {isLand ? 'Land' : 'House'}
          </span>
          {property.status === 'pending' && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-medium">Selling fast</span>
          )}
          {property.status === 'sold' && (
            <span className="px-2.5 py-1 rounded-full bg-ink text-white text-xs font-medium">Sold</span>
          )}
        </div>
      </div>

      <div className="pt-3.5 pb-1">
        <p className="text-xs font-medium text-brand uppercase tracking-wider">{property.district}</p>
        <h3 className="mt-1 text-[17px] leading-snug font-medium text-ink group-hover:text-brand transition-colors line-clamp-2">
          {property.title}
        </h3>
        {facts.length > 0 && (
          <p className="mt-1.5 text-sm text-neutral-500 flex flex-wrap items-center gap-x-2">
            {facts.map((f, i) => (
              <span key={f} className="inline-flex items-center gap-2">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-neutral-300" aria-hidden="true" />}
                {f}
              </span>
            ))}
          </p>
        )}
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-ink">
            {label && <span className="text-sm text-neutral-500 mr-1.5">{label}</span>}
            <span className="text-xl font-semibold tracking-tight">{amount}</span>
          </p>
          {options > 1 && (
            <span className="text-xs text-neutral-500 whitespace-nowrap pb-1">{options} options</span>
          )}
        </div>
      </div>
    </Link>
  )
}
