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
          className={`flex-1 py-4 text-sm font-medium transition-colors ${
            type === 'house'
              ? 'bg-[#0055CC] text-white'
              : 'bg-white text-neutral-600 hover:text-[#0055CC]'
          }`}
        >
          Houses
        </button>
        <button
          type="button"
          onClick={() => setType('land')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${
            type === 'land'
              ? 'bg-[#0055CC] text-white'
              : 'bg-white text-neutral-600 hover:text-[#0055CC]'
          }`}
        >
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
