
import { HugeiconsIcon } from '@hugeicons/react'
import { Home01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import Image from 'next/image'
import { Property } from '@/lib/types'
import { priceHeadline, propertyFacts, propertyCardName } from '@/lib/format'

interface PropertyCardProps {
  property: Property
  variant?: 'default' | 'featured'
  priority?: boolean
}

export default function PropertyCard({ property, variant = 'default', priority = false }: PropertyCardProps) {
  const { amount, label } = priceHeadline(property)
  const facts = propertyFacts(property)
  const name = propertyCardName(property)
  const options = property.variations?.length || 0
  const isLand = property.type === 'land'

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-offset-4"
      aria-label={`${name}, ${property.district}. ${label} ${amount}`}
    >
      {/* Image container */}
      <div className={`relative overflow-hidden bg-neutral-100 ${variant === 'featured' ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-[3/2]'}`}>
        {/* Placeholder shown behind the photo (and if it fails to load) */}
        <HugeiconsIcon icon={Home01Icon} className="absolute inset-0 m-auto w-10 h-10 text-neutral-300" strokeWidth={1.7} aria-hidden="true" />
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
            <span className="px-2.5 py-1 rounded-full bg-brand-dark text-white text-xs font-medium">Sold</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider line-clamp-2">{name}</p>
        <h3 className="text-base font-semibold text-ink leading-snug group-hover:text-brand transition-colors line-clamp-2">
          {property.district}
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
        {/* Options and price share a baseline and type size. */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-baseline justify-between gap-3 text-sm">
          {options > 1 && (
            <span className="shrink-0 text-neutral-500">{options} options</span>
          )}
          <p className="ml-auto text-right text-sm text-ink">
            {label && <span className="text-neutral-500">{label} </span>}
            <span className="font-medium">{amount}</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
