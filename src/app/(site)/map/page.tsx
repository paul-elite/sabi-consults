import Link from 'next/link'
import { Suspense } from 'react'
import MapWrapper from '@/components/MapWrapper'
import { getAllProperties } from '@/lib/properties'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Property Map | Sabi Consults',
  description: 'Explore available properties across Abuja on our interactive map. Find houses and land in Maitama, Asokoro, Wuse II, and other premium districts.',
}

export default async function MapPage() {
  const properties = await getAllProperties()

  // Filter to only show available properties
  const availableProperties = properties.filter(p => p.status === 'available')

  // Count by type
  const houseCount = availableProperties.filter(p => p.type === 'house').length
  const landCount = availableProperties.filter(p => p.type === 'land').length

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-[#1a1a1a]">
                Property Map
              </h1>
              <p className="text-neutral-600 mt-1">
                Explore {availableProperties.length} properties across Abuja
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#0055CC]"></div>
                <span className="text-sm text-neutral-600">Houses ({houseCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#059669]"></div>
                <span className="text-sm text-neutral-600">Land ({landCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Page Map */}
      <div className="h-[calc(100vh-180px)] relative">
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

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
          <Link
            href="/properties"
            className="px-4 py-2 bg-white shadow-lg text-sm font-medium text-[#1a1a1a] hover:bg-neutral-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List View
          </Link>
        </div>

        {/* Property Count Badge */}
        <div className="absolute top-4 right-4 z-[1000] bg-white shadow-lg px-4 py-2">
          <p className="text-sm font-medium text-[#1a1a1a]">
            {availableProperties.length} Properties
          </p>
          <p className="text-xs text-neutral-500">Click markers for details</p>
        </div>
      </div>
    </div>
  )
}
