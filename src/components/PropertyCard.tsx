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

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block bg-white overflow-hidden"
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden ${isFeatured ? 'aspect-[4/3]' : 'aspect-[3/2]'}`}>
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Status Badge */}
        {property.status !== 'available' && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-[#1a1a1a] text-white text-xs font-medium uppercase tracking-wider">
            {property.status}
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 text-[#1a1a1a] text-xs font-medium uppercase tracking-wider">
          For {property.type === 'sale' ? 'Sale' : 'Rent'}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* District */}
        <p className="text-xs font-medium text-[#8b7355] uppercase tracking-wider mb-2">
          {property.district}
        </p>

        {/* Title */}
        <h3 className={`font-medium text-[#1a1a1a] group-hover:text-[#8b7355] transition-colors ${
          isFeatured ? 'text-lg mb-2' : 'text-base mb-1'
        }`}>
          {property.title}
        </h3>

        {/* Property Details */}
        {(property.bedrooms || property.bathrooms || property.size) && (
          <div className="flex items-center gap-4 text-sm text-neutral-500 mb-3">
            {property.bedrooms && (
              <span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span>
            )}
            {property.bathrooms && (
              <span>{property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}</span>
            )}
            {property.size && (
              <span>{property.size.toLocaleString()} sqm</span>
            )}
          </div>
        )}

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
