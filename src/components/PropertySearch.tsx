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
          className="flex-1 min-w-[150px] px-4 py-3 bg-white border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
        >
          <option value="">All Districts</option>
          {districts.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-8 py-3 bg-[#0055CC] text-white text-sm font-medium hover:bg-[#0044aa] transition-colors"
        >
          Search
        </button>
      </form>
    )
  }

  return (
    <div className={`bg-white shadow-xl ${className}`}>
      {/* Type Toggle */}
      <div className="flex border-b border-neutral-100">
        <button
          type="button"
          onClick={() => setType('house')}
          className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            type === 'house'
              ? 'bg-[#0055CC] text-white'
              : 'bg-white text-neutral-600 hover:text-[#0055CC]'
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
          className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            type === 'land'
              ? 'bg-[#0055CC] text-white'
              : 'bg-white text-neutral-600 hover:text-[#0055CC]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Land
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* District Select */}
          <div>
            <label htmlFor="district" className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
              Location
            </label>
            <select
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 appearance-none cursor-pointer"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Price Range Select */}
          <div>
            <label htmlFor="priceRange" className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
              Price Range
            </label>
            <select
              id="priceRange"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 appearance-none cursor-pointer"
            >
              <option value="">Any Price</option>
              <option value="0-100000000">Under ₦100M</option>
              <option value="100000000-250000000">₦100M - ₦250M</option>
              <option value="250000000-500000000">₦250M - ₦500M</option>
              <option value="500000000-1000000000">₦500M - ₦1B</option>
              <option value="1000000000-">Above ₦1B</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="w-full py-4 bg-[#0055CC] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#0044aa] transition-colors"
        >
          Search Properties
        </button>
      </form>
    </div>
  )
}
