import Link from 'next/link'
import Image from 'next/image'
import { Property } from '@/lib/types'

interface PropertyCardProps {
  property: Property
  variant?: 'default' | 'featured'
}

// Format price in Nigerian Naira
function formatPrice(price: number): string {
  if (price >= 1000000000) {
    return `₦${(price / 1000000000).toFixed(1)}B`
  }
  if (price >= 1000000) {
    return `₦${(price / 1000000).toFixed(0)}M`
  }
  return `₦${price.toLocaleString()}`
}

export default function PropertyCard({ property, variant = 'default' }: PropertyCardProps) {
  const isFeatured = variant === 'featured'
  const isLand = property.type === 'land'

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block bg-white overflow-hidden"
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden ${isFeatured ? 'aspect-[4/3]' : 'aspect-[3/2]'}`}>
        {property.images[0] ? (
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
            <span className="text-neutral-400">No Image</span>
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Status Badge */}
        {property.status !== 'available' && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-[#1a1a1a] text-white text-xs font-medium uppercase tracking-wider">
            {property.status}
          </div>
        )}

        {/* Type Badge */}
        <div className={`absolute top-4 right-4 px-3 py-1 text-xs font-medium uppercase tracking-wider ${
          isLand ? 'bg-[#0055CC] text-white' : 'bg-white/90 text-[#1a1a1a]'
        }`}>
          {isLand ? 'Land' : 'House'}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* District */}
        <p className="text-xs font-medium text-[#0055CC] uppercase tracking-wider mb-2">
          {property.district}
        </p>

        {/* Title */}
        <h3 className={`font-medium text-[#1a1a1a] group-hover:text-[#0055CC] transition-colors ${
          isFeatured ? 'text-lg mb-2' : 'text-base mb-1'
        }`}>
          {property.title}
        </h3>

        {/* Property Details */}
        <div className="flex items-center gap-4 text-sm text-neutral-500 mb-3">
          {isLand ? (
            // Land details
            property.landSize && (
              <span>{property.landSize.toLocaleString()} sqm</span>
            )
          ) : (
            // House details
            <>
              {property.bedrooms !== undefined && property.bedrooms > 0 && (
                <span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span>
              )}
              {property.bathrooms !== undefined && property.bathrooms > 0 && (
                <span>{property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}</span>
              )}
              {property.bq !== undefined && property.bq > 0 && (
                <span>{property.bq} BQ</span>
              )}
              {property.landSize !== undefined && property.landSize > 0 && (
                <span>{property.landSize.toLocaleString()} sqm</span>
              )}
            </>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold text-[#1a1a1a] ${isFeatured ? 'text-xl' : 'text-lg'}`}>
            {formatPrice(property.price)}
          </span>
          {property.priceLabel && (
            <span className="text-sm text-neutral-500">{property.priceLabel}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
