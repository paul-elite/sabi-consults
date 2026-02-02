import { Suspense } from 'react'
import PropertyCard from '@/components/PropertyCard'
import PropertySearch from '@/components/PropertySearch'
import MapWrapper from '@/components/MapWrapper'
import { filterProperties, getAllProperties } from '@/lib/properties'
import { districts } from '@/data/properties'

// Force dynamic rendering to fetch fresh data
export const dynamic = 'force-dynamic'

interface PropertiesPageProps {
  searchParams: Promise<{
    type?: string
    district?: string
    priceRange?: string
  }>
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = await searchParams

  // Parse price range
  let minPrice: number | undefined
  let maxPrice: number | undefined
  if (params.priceRange) {
    const [min, max] = params.priceRange.split('-').map(Number)
    if (min) minPrice = min
    if (max) maxPrice = max
  }

  // Fetch properties from Supabase
  const filteredProperties = await filterProperties({
    type: params.type,
    district: params.district,
    minPrice,
    maxPrice,
  })

  // Fallback to all properties if no filters
  const properties = filteredProperties.length > 0 || params.type || params.district || params.priceRange
    ? filteredProperties
    : await getAllProperties()

  const hasFilters = params.type || params.district || params.priceRange

  return (
    <div className="pt-20">
      {/* Header */}
      <section className="bg-[#f8f6f3] py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-light text-[#1a1a1a] mb-4">
              {params.district ? `Properties in ${params.district}` : 'All Properties'}
            </h1>
            <p className="text-neutral-600">
              Discover premium real estate opportunities across Abuja&apos;s most sought-after districts.
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-1">
              <div className="sticky top-28 space-y-8">
                {/* Search Form */}
                <div className="bg-white border border-neutral-200 p-6">
                  <h3 className="font-medium text-[#1a1a1a] mb-4">Filter Properties</h3>
                  <PropertySearch variant="compact" className="flex-col" />
                </div>

                {/* Districts Quick Links */}
                <div className="bg-white border border-neutral-200 p-6">
                  <h3 className="font-medium text-[#1a1a1a] mb-4">Districts</h3>
                  <ul className="space-y-2">
                    {districts.map((district) => (
                      <li key={district.id}>
                        <a
                          href={`/properties?district=${district.name}`}
                          className={`text-sm hover:text-[#0055CC] transition-colors ${
                            params.district?.toLowerCase() === district.name.toLowerCase()
                              ? 'text-[#0055CC] font-medium'
                              : 'text-neutral-600'
                          }`}
                        >
                          {district.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Map Preview */}
                <div className="bg-white border border-neutral-200 overflow-hidden">
                  <div className="p-4 border-b border-neutral-200">
                    <h3 className="font-medium text-[#1a1a1a] text-sm">Abuja Map</h3>
                  </div>
                  <div className="h-64">
                    <Suspense fallback={<div className="w-full h-full bg-neutral-100" />}>
                      <MapWrapper properties={properties} interactive={false} />
                    </Suspense>
                  </div>
                </div>
              </div>
            </aside>

            {/* Property Grid */}
            <div className="lg:col-span-3">
              {/* Results Count */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-neutral-600">
                  {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
                  {hasFilters && (
                    <a href="/properties" className="ml-2 text-[#0055CC] hover:underline">
                      Clear filters
                    </a>
                  )}
                </p>
              </div>

              {/* Grid */}
              {properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-neutral-50">
                  <p className="text-neutral-600 mb-4">No properties match your criteria.</p>
                  <a
                    href="/properties"
                    className="text-sm font-medium text-[#0055CC] hover:underline"
                  >
                    View all properties
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
