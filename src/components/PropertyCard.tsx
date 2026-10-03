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
      className="group block bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-300 focus-visible:outline-offset-4"
      aria-label={`${property.title}, ${property.district}. ${label} ${amount}`}
    >
      {/* Image container */}
      <div className={`relative overflow-hidden bg-neutral-100 ${variant === 'featured' ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-[3/2]'}`}>
        {/* Placeholder shown behind the photo (and if it fails to load) */}
        <svg className="absolute inset-0 m-auto w-10 h-10 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isLand ? 'bg-emerald-500 text-white' : 'bg-brand text-white'}`}>
            {isLand ? 'Land' : 'House'}
          </span>
          {property.status === 'pending' && (
            <span className="px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-medium">Selling fast</span>
          )}
          {property.status === 'sold' && (
            <span className="px-2.5 py-1 rounded-full bg-neutral-900 text-white text-xs font-medium">Sold</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{property.district}</p>
          {options > 1 && (
            <span className="text-xs text-neutral-400">{options} options</span>
          )}
        </div>
        <h3 className="text-base font-medium text-ink leading-snug group-hover:text-brand transition-colors line-clamp-2">
          {property.title}
        </h3>
        {facts.length > 0 && (
          <p className="mt-2 text-sm text-neutral-500 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {facts.map((f, i) => (
              <span key={f} className="inline-flex items-center gap-2.5">
                {i > 0 && <span className="w-0.5 h-0.5 rounded-full bg-neutral-300" aria-hidden="true" />}
                {f}
              </span>
            ))}
          </p>
        )}
        {/* Price */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-baseline justify-between gap-3">
          <p className="text-ink">
            {label && <span className="text-xs text-neutral-400 mr-1.5">{label}</span>}
            <span className="text-lg font-semibold tracking-tight">{amount}</span>
          </p>
          <span className="text-xs font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}
