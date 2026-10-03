'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { districts } from '@/data/properties'

interface PropertySearchProps {
  variant?: 'hero' | 'compact'
  className?: string
}

export default function PropertySearch({ variant = 'hero', className = '' }: PropertySearchProps) {
  const router = useRouter()
  const [type, setType] = useState<'house' | 'land'>('house')
  const [district, setDistrict] = useState('')
  const [priceRange, setPriceRange] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('type', type)
    if (district) params.set('district', district)
    if (priceRange) params.set('priceRange', priceRange)
    router.push(`/properties?${params.toString()}`)
  }

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSearch} className={`flex flex-wrap gap-3 ${className}`}>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="flex-1 min-w-[150px] h-11 px-3 rounded-lg bg-white border border-neutral-300 text-[15px] focus:outline-none focus:border-brand"
        >
          <option value="">All areas</option>
          {districts.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 px-6 rounded-lg bg-brand text-on-brand text-sm font-medium hover:bg-brand-dark transition-colors"
        >
          Search
        </button>
      </form>
    )
  }

  return (
    <div className={`bg-white shadow-xl rounded-2xl overflow-hidden text-left ${className}`}>
      {/* Type Toggle */}
      <div className="flex p-1.5 gap-1.5 bg-neutral-100 m-3 sm:m-4 mb-0 sm:mb-0 rounded-xl">
        <button
          type="button"
          onClick={() => setType('house')}
          className={`flex-1 h-11 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            type === 'house'
              ? 'bg-brand text-white'
              : 'bg-transparent text-neutral-600 hover:text-ink'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Houses
        </button>
        <button
          type="button"
          onClick={() => setType('land')}
          className={`flex-1 h-11 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            type === 'land'
              ? 'bg-brand text-white'
              : 'bg-transparent text-neutral-600 hover:text-ink'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Land
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mb-3 sm:mb-4">
          {/* District Select */}
          <div>
            <label htmlFor="district" className="block text-xs font-medium text-neutral-500 mb-1.5 pl-1">
              Location
            </label>
            <select
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full h-12 px-3 rounded-lg bg-white border border-neutral-300 text-[15px] text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer"
            >
              <option value="">All areas</option>
              {districts.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Price Range Select */}
          <div>
            <label htmlFor="priceRange" className="block text-xs font-medium text-neutral-500 mb-1.5 pl-1">
              Price Range
            </label>
            <select
              id="priceRange"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full h-12 px-3 rounded-lg bg-white border border-neutral-300 text-[15px] text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer"
            >
              <option value="">Any price</option>
              <option value="0-20000000">Under ₦20M</option>
              <option value="20000000-50000000">₦20M – ₦50M</option>
              <option value="50000000-100000000">₦50M – ₦100M</option>
              <option value="100000000-0">₦100M and above</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="w-full h-12 rounded-lg bg-brand text-on-brand font-medium hover:bg-brand-dark transition-colors"
        >
          Search properties
        </button>
      </form>
    </div>
  )
}
