import Link from 'next/link'
import PropertyCard from '@/components/PropertyCard'
import { filterProperties } from '@/lib/properties'

// Force dynamic rendering to fetch fresh data
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Properties' }

interface PropertiesPageProps {
  searchParams: Promise<{ type?: string; district?: string; priceRange?: string; sort?: string }>
}

const PRICE_RANGES = [
  { value: '0-20000000', label: 'Under ₦20M' },
  { value: '20000000-50000000', label: '₦20M – ₦50M' },
  { value: '50000000-100000000', label: '₦50M – ₦100M' },
  { value: '100000000-0', label: '₦100M+' },
]

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = await searchParams
  let minPrice: number | undefined
  let maxPrice: number | undefined
  if (params.priceRange) {
    const [min, max] = params.priceRange.split('-').map(Number)
    if (min) minPrice = min
    if (max) maxPrice = max
  }

  const [results, everything] = await Promise.all([
    filterProperties({ type: params.type, district: params.district, minPrice, maxPrice }),
    filterProperties({}),
  ])
  const properties = [...results]
  if (params.sort === 'price-asc') properties.sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
  if (params.sort === 'price-desc') properties.sort((a, b) => b.price - a.price)

  // Only offer districts that actually have listings, with counts
  const districtCounts = everything.reduce<Record<string, number>>((acc, p) => {
    acc[p.district] = (acc[p.district] || 0) + 1
    return acc
  }, {})
  const districtList = Object.entries(districtCounts).sort((a, b) => b[1] - a[1])

  const hasFilters = !!(params.type || params.district || params.priceRange)
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const merged = { ...params, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
    const qs = next.toString()
    return qs ? `/properties?${qs}` : '/properties'
  }
  const chip = (active: boolean) =>
    `shrink-0 inline-flex items-center h-10 px-4 rounded-full border text-sm whitespace-nowrap transition-colors ${
      active ? 'bg-ink border-ink text-white' : 'bg-white border-neutral-300 text-ink hover:border-ink'
    }`

  const heading = params.district
    ? `Properties in ${params.district}`
    : params.type === 'land' ? 'Land for sale' : params.type === 'house' ? 'Homes for sale' : 'All properties'

  return (
    <div className="pt-16 lg:pt-20">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-4">
        <h1 className="text-3xl sm:text-4xl font-light text-ink">{heading}</h1>
        <p className="mt-2 text-neutral-600 text-[15px]">Land and homes across Abuja, with plot sizes and flexible payment options.</p>
      </section>

      {/* Filter chips: sticky under the header, scroll sideways on phones */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] lg:top-20 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
        <nav aria-label="Filters" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          <Link href={href({ type: undefined })} className={chip(!params.type)}>All</Link>
          <Link href={href({ type: 'house' })} className={chip(params.type === 'house')}>Houses</Link>
          <Link href={href({ type: 'land' })} className={chip(params.type === 'land')}>Land</Link>
          <span className="shrink-0 w-px bg-neutral-200 mx-1" aria-hidden="true" />
          {PRICE_RANGES.map(r => (
            <Link key={r.value} href={href({ priceRange: params.priceRange === r.value ? undefined : r.value })} className={chip(params.priceRange === r.value)}>
              {r.label}
            </Link>
          ))}
          <span className="shrink-0 w-px bg-neutral-200 mx-1" aria-hidden="true" />
          {districtList.map(([name, count]) => {
            const active = params.district?.toLowerCase() === name.toLowerCase()
            return (
              <Link key={name} href={href({ district: active ? undefined : name })} className={chip(active)}>
                {name}<span className={`ml-1.5 text-xs ${active ? 'text-white/70' : 'text-neutral-400'}`}>{count}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-sm text-neutral-600 whitespace-nowrap" aria-live="polite">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
            {hasFilters && <Link href="/properties" className="ml-3 text-brand font-medium hover:underline">Clear filters</Link>}
          </p>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-neutral-500 hidden sm:inline mr-1">Sort:</span>
            {[['', 'Newest'], ['price-asc', 'Price ↑'], ['price-desc', 'Price ↓']].map(([v, label]) => (
              <Link key={v} href={href({ sort: v || undefined })}
                className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${(params.sort || '') === v ? 'bg-neutral-100 text-ink font-medium' : 'text-neutral-500 hover:text-ink'}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9">
            {/* Map tile (tablet and up); phones get the floating Map button */}
            <Link href="/map" className="hidden sm:flex relative rounded-xl overflow-hidden bg-brand-soft aspect-[3/2] items-center justify-center group">
              <svg className="absolute inset-0 w-full h-full text-brand/10" aria-hidden="true">
                <defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              <span className="relative inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand text-on-brand text-sm font-medium shadow-md group-hover:bg-brand-dark transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Show on map
              </span>
            </Link>
            {properties.map((property, i) => (
              <PropertyCard key={property.id} property={property} priority={i < 2} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 rounded-xl bg-surface">
            <p className="text-ink font-medium mb-1">No properties match these filters</p>
            <p className="text-sm text-neutral-600 mb-5">Try a different price range or area, or ask us: new listings often go to our contacts first.</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/properties" className="h-11 px-5 inline-flex items-center rounded-full bg-brand text-on-brand text-sm font-medium">See all properties</Link>
              <Link href="/contact" className="h-11 px-5 inline-flex items-center rounded-full border border-neutral-300 text-sm">Tell us what you need</Link>
            </div>
          </div>
        )}
      </section>

      {/* Floating map button on phones */}
      <Link href="/map" className="sm:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 h-12 px-5 rounded-full bg-ink text-white text-sm font-medium shadow-lg">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        Map
      </Link>
    </div>
  )
}
