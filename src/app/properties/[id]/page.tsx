import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPropertyById } from '@/lib/properties'
import { Suspense } from 'react'
import ContactForm from '@/components/ContactForm'
import MapWrapper from '@/components/MapWrapper'

// Enable dynamic rendering (no static generation)
export const dynamic = 'force-dynamic'

// Format price
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

interface PropertyPageProps {
  params: Promise<{ id: string }>
}

export default async function PropertyDetailPage({ params }: PropertyPageProps) {
  const { id } = await params
  const property = await getPropertyById(id)

  if (!property) {
    notFound()
  }

  return (
    <div className="pt-20">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-neutral-500 hover:text-[#1a1a1a]">
              Home
            </Link>
            <span className="text-neutral-300">/</span>
            <Link href="/properties" className="text-neutral-500 hover:text-[#1a1a1a]">
              Properties
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-[#1a1a1a]">{property.district}</span>
          </nav>
        </div>
      </div>

      {/* Image Gallery */}
      <section className="bg-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            {/* Main Image */}
            <div className="relative aspect-[4/3] lg:aspect-auto lg:row-span-2">
              <Image
                src={property.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'}
                alt={property.title}
                fill
                className="object-cover"
                priority
              />
            </div>
            {/* Secondary Images */}
            {property.images.slice(1, 3).map((image, index) => (
              <div key={index} className="relative aspect-[4/3] hidden lg:block">
                <Image
                  src={image}
                  alt={`${property.title} - Image ${index + 2}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Property Details */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 text-xs font-medium uppercase tracking-wider ${
                    property.type === 'land' ? 'bg-[#0055CC] text-white' : 'bg-[#f8f6f3] text-[#0055CC]'
                  }`}>
                    {property.type === 'land' ? 'Land' : 'House'}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-light text-[#1a1a1a] mb-2">
                  {property.title}
                </h1>
                <p className="text-neutral-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {property.address}
                </p>
              </div>

              {/* Key Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-neutral-200">
                {property.bedrooms && (
                  <div>
                    <p className="text-2xl font-light text-[#1a1a1a]">{property.bedrooms}</p>
                    <p className="text-sm text-neutral-500">Bedrooms</p>
                  </div>
                )}
                {property.bathrooms && (
                  <div>
                    <p className="text-2xl font-light text-[#1a1a1a]">{property.bathrooms}</p>
                    <p className="text-sm text-neutral-500">Bathrooms</p>
                  </div>
                )}
                {property.landSize && (
                  <div>
                    <p className="text-2xl font-light text-[#1a1a1a]">{property.landSize.toLocaleString()}</p>
                    <p className="text-sm text-neutral-500">Sq. Meters</p>
                  </div>
                )}
                {property.bq !== undefined && property.bq > 0 && (
                  <div>
                    <p className="text-2xl font-light text-[#1a1a1a]">{property.bq}</p>
                    <p className="text-sm text-neutral-500">BQ</p>
                  </div>
                )}
                <div>
                  <p className="text-2xl font-light text-[#1a1a1a]">{property.district}</p>
                  <p className="text-sm text-neutral-500">District</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-medium text-[#1a1a1a] mb-4">Description</h2>
                <p className="text-neutral-600 leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
              </div>

              {/* Variations / Unit Types */}
              {property.variations && property.variations.length > 0 && (
                <div>
                  <h2 className="text-xl font-medium text-[#1a1a1a] mb-4">
                    {property.type === 'land' ? 'Available Plot Sizes' : 'Available Unit Types'}
                  </h2>
                  <div className="space-y-3">
                    {property.variations.map((variation) => (
                      <div
                        key={variation.id}
                        className={`border p-4 ${
                          variation.status === 'sold'
                            ? 'bg-neutral-50 border-neutral-200 opacity-60'
                            : 'bg-white border-neutral-200 hover:border-[#0055CC]'
                        } transition-colors`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-[#1a1a1a]">{variation.name}</h3>
                              {variation.status === 'sold' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium uppercase">
                                  Sold Out
                                </span>
                              )}
                              {variation.status === 'pending' && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium uppercase">
                                  Pending
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                              {variation.bedrooms && (
                                <span>{variation.bedrooms} Bed{variation.bedrooms > 1 ? 's' : ''}</span>
                              )}
                              {variation.bathrooms && (
                                <span>{variation.bathrooms} Bath{variation.bathrooms > 1 ? 's' : ''}</span>
                              )}
                              {variation.bq !== undefined && variation.bq > 0 && (
                                <span>{variation.bq} BQ</span>
                              )}
                              {variation.landSize && (
                                <span>{variation.landSize.toLocaleString()} sqm</span>
                              )}
                              {variation.unitsAvailable !== undefined && variation.unitsAvailable > 0 && (
                                <span className="text-[#0055CC]">{variation.unitsAvailable} units left</span>
                              )}
                            </div>
                          </div>
                          {variation.price && (
                            <div className="text-right">
                              <p className="text-lg font-medium text-[#0055CC]">
                                {formatPrice(variation.price)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {property.features.length > 0 && (
                <div>
                  <h2 className="text-xl font-medium text-[#1a1a1a] mb-4">Features & Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-[#0055CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-neutral-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              <div>
                <h2 className="text-xl font-medium text-[#1a1a1a] mb-4">Location</h2>
                <div className="h-80 border border-neutral-200">
                  <Suspense fallback={<div className="w-full h-full bg-neutral-100" />}>
                    <MapWrapper selectedProperty={property} />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                {/* Price Card */}
                <div className="bg-[#1a1a1a] text-white p-8">
                  <p className="text-sm text-neutral-400 mb-2">Price</p>
                  <p className="text-3xl font-light mb-1">
                    {formatPrice(property.price)}
                  </p>
                  {property.priceLabel && (
                    <p className="text-sm text-neutral-400">{property.priceLabel}</p>
                  )}
                </div>

                {/* Contact Card */}
                <div className="bg-white border border-neutral-200 p-6">
                  <h3 className="font-medium text-[#1a1a1a] mb-4">Interested in this property?</h3>
                  <ContactForm propertyId={property.id} propertyTitle={property.title} />
                </div>

                {/* WhatsApp CTA */}
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348000000000'}?text=Hi, I'm interested in: ${property.title} (${property.district})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] text-white font-medium hover:bg-[#20bd5a] transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
