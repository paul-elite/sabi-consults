
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { Suspense } from 'react'
import MapWrapper from '@/components/MapWrapper'
import { getAllProperties } from '@/lib/properties'
import { Property } from '@/lib/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Property Map',
  description: 'Explore available properties across Abuja on our interactive map. Find houses and land in Maitama, Asokoro, Wuse II, and other premium districts.',
}

export default async function MapPage() {
  let properties: Property[] = []
  let error: string | null = null

  try {
    properties = await getAllProperties()
  } catch (e) {
    console.error('Error fetching properties for map:', e)
    error = 'Failed to load properties'
  }

  // Filter to only show available properties
  const availableProperties = properties.filter(p => p.status === 'available')

  // Count by type
  const houseCount = availableProperties.filter(p => p.type === 'house').length
  const landCount = availableProperties.filter(p => p.type === 'land').length

  return (
    // Full-screen map under the floating header: no title band, so no gap above the map
    <div className="relative h-[100dvh] min-h-[480px] bg-neutral-100">
      <h1 className="sr-only">Property Map</h1>
      {/* Full Page Map */}
      <div className="absolute inset-0">
        {error ? (
          <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
            <div className="text-center">
              <p className="text-neutral-500 mb-4">{error}</p>
              <Link
                href="/properties"
                className="rounded-lg px-4 py-2 bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors"
              >
                View Properties List
              </Link>
            </div>
          </div>
        ) : (
          <Suspense fallback={
            <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
              <div className="text-neutral-400 animate-pulse">Loading map...</div>
            </div>
          }>
            <MapWrapper
              properties={availableProperties}
              interactive={true}
              fullPage={true}
            />
          </Suspense>
        )}

        {/* Legend and count, below the floating header */}
        {!error && (
          <div className="absolute top-[calc(env(safe-area-inset-top)+5.25rem)] lg:top-[calc(env(safe-area-inset-top)+6rem)] left-4 sm:left-6 z-[1000] rounded-2xl bg-white/95 backdrop-blur shadow-lg px-4 py-3">
            <p className="text-sm font-semibold text-ink">{availableProperties.length} properties in Abuja</p>
            <div className="mt-1.5 flex items-center gap-4 text-xs text-neutral-600">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0047E0]" aria-hidden="true" />Houses ({houseCount})</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00A35F]" aria-hidden="true" />Land ({landCount})</span>
            </div>
          </div>
        )}

        {/* Back to the list, clear of the phone's home bar */}
        <Link
          href="/properties"
          className="absolute left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-[1000] h-12 px-5 rounded-full bg-ink text-white shadow-lg text-sm font-medium inline-flex items-center gap-2 hover:bg-black transition-colors"
        >
          <HugeiconsIcon icon={Menu01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          List view
        </Link>
      </div>
    </div>
  )
}
