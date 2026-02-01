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
  const [type, setType] = useState<'sale' | 'rent'>('sale')
  const [district, setDistrict] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [priceRange, setPriceRange] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('type', type)
    if (district) params.set('district', district)
    if (propertyType) params.set('propertyType', propertyType)
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
          className="px-8 py-3 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#2d2d2d] transition-colors"
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
          onClick={() => setType('sale')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${
            type === 'sale'
              ? 'bg-[#1a1a1a] text-white'
              : 'bg-white text-neutral-600 hover:text-[#1a1a1a]'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setType('rent')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${
            type === 'rent'
              ? 'bg-[#1a1a1a] text-white'
              : 'bg-white text-neutral-600 hover:text-[#1a1a1a]'
          }`}
        >
          Rent
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

          {/* Property Type Select */}
          <div>
            <label htmlFor="propertyType" className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
              Property Type
            </label>
            <select
              id="propertyType"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 appearance-none cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
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
              {type === 'sale' ? (
                <>
                  <option value="0-100000000">Under ₦100M</option>
                  <option value="100000000-250000000">₦100M - ₦250M</option>
                  <option value="250000000-500000000">₦250M - ₦500M</option>
                  <option value="500000000-1000000000">₦500M - ₦1B</option>
                  <option value="1000000000-">Above ₦1B</option>
                </>
              ) : (
                <>
                  <option value="0-3000000">Under ₦3M/year</option>
                  <option value="3000000-5000000">₦3M - ₦5M/year</option>
                  <option value="5000000-10000000">₦5M - ₦10M/year</option>
                  <option value="10000000-">Above ₦10M/year</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="w-full py-4 bg-[#1a1a1a] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#2d2d2d] transition-colors"
        >
          Search Properties
        </button>
      </form>
    </div>
  )
}
