'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { districts } from '@/data/properties'
import { PropertyVariation } from '@/lib/types'

// Dynamic import for map
const AbujaMap = dynamic(() => import('@/components/AbujaMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />,
})

interface PropertyForm {
  title: string
  description: string
  price: string
  priceLabel: string
  type: 'land' | 'house'
  district: string
  address: string
  latitude: string
  longitude: string
  bedrooms: string
  bathrooms: string
  bq: string
  landSize: string
  images: string
  features: string
  status: 'available' | 'sold' | 'pending'
  featured: boolean
}

interface VariationForm {
  id: string
  name: string
  price: string
  bedrooms: string
  bathrooms: string
  bq: string
  landSize: string
  unitsAvailable: string
  status: 'available' | 'sold' | 'pending'
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

// Parse coordinates from various Google Maps URL formats
function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Format: https://www.google.com/maps/place/.../@9.0579,7.4951,17z/...
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    }

    // Format: https://maps.google.com/?q=9.0579,7.4951 or ?ll=9.0579,7.4951
    const qMatch = url.match(/[?&](q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (qMatch) {
      return { lat: parseFloat(qMatch[2]), lng: parseFloat(qMatch[3]) }
    }

    // Format: https://www.google.com/maps?q=9.0579,7.4951
    const queryMatch = url.match(/maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (queryMatch) {
      return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) }
    }

    // Format: coordinates in data parameter: !3d9.0579!4d7.4951
    const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) }
    }

    return null
  } catch {
    return null
  }
}

function createEmptyVariation(): VariationForm {
  return {
    id: generateId(),
    name: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    bq: '',
    landSize: '',
    unitsAvailable: '',
    status: 'available',
  }
}

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [locationError, setLocationError] = useState('')
  const [form, setForm] = useState<PropertyForm>({
    title: '',
    description: '',
    price: '',
    priceLabel: '',
    type: 'house',
    district: 'Maitama',
    address: '',
    latitude: '9.0579',
    longitude: '7.4951',
    bedrooms: '',
    bathrooms: '',
    bq: '',
    landSize: '',
    images: '',
    features: '',
    status: 'available',
    featured: false,
  })
  const [variations, setVariations] = useState<VariationForm[]>([])

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth')
        const data = await res.json()
        if (!data.authenticated) {
          router.push('/admin')
        }
      } catch {
        router.push('/admin')
      }
    }
    checkAuth()
  }, [router])

  const handleDistrictChange = (districtName: string) => {
    const district = districts.find(d => d.name === districtName)
    if (district) {
      setForm({
        ...form,
        district: districtName,
        latitude: district.latitude.toString(),
        longitude: district.longitude.toString(),
      })
    }
  }

  const addVariation = () => {
    setVariations([...variations, createEmptyVariation()])
  }

  const removeVariation = (id: string) => {
    setVariations(variations.filter(v => v.id !== id))
  }

  const updateVariation = (id: string, field: keyof VariationForm, value: string) => {
    setVariations(variations.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ))
  }

  const handleGoogleMapsUrl = (url: string) => {
    setGoogleMapsUrl(url)
    setLocationError('')

    if (!url.trim()) return

    const coords = parseGoogleMapsUrl(url)
    if (coords) {
      setForm({
        ...form,
        latitude: coords.lat.toString(),
        longitude: coords.lng.toString(),
      })
      setLocationError('')
    } else {
      setLocationError('Could not extract coordinates. Please paste a valid Google Maps URL or enter coordinates manually.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Transform variations to proper format (only include non-empty ones)
    const formattedVariations: PropertyVariation[] = variations
      .filter(v => v.name.trim()) // Only include variations with a name
      .map(v => ({
        id: v.id,
        name: v.name,
        price: v.price ? Number(v.price) : undefined,
        bedrooms: v.bedrooms ? Number(v.bedrooms) : undefined,
        bathrooms: v.bathrooms ? Number(v.bathrooms) : undefined,
        bq: v.bq ? Number(v.bq) : undefined,
        landSize: v.landSize ? Number(v.landSize) : undefined,
        unitsAvailable: v.unitsAvailable ? Number(v.unitsAvailable) : undefined,
        status: v.status,
      }))

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          priceLabel: form.priceLabel || undefined,
          type: form.type,
          district: form.district,
          address: form.address,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
          bq: form.bq ? parseInt(form.bq) : 0,
          landSize: form.landSize ? parseInt(form.landSize) : undefined,
          images: form.images.split('\n').filter(Boolean),
          features: form.features.split('\n').filter(Boolean),
          variations: formattedVariations.length > 0 ? formattedVariations : undefined,
          status: form.status,
          featured: form.featured,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create property')
      }

      router.push('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setLoading(false)
    }
  }

  // Preview property for map
  const previewProperty = {
    id: 'preview',
    title: form.title || 'New Property',
    latitude: parseFloat(form.latitude) || 9.0579,
    longitude: parseFloat(form.longitude) || 7.4951,
    district: form.district,
    description: '',
    price: 0,
    type: form.type,
    address: form.address,
    images: [],
    features: [],
    status: 'available' as const,
    featured: false,
    createdAt: '',
    updatedAt: '',
  }

  const isLand = form.type === 'land'

  return (
    <div className="min-h-screen">
      {/* Admin Header */}
      <header className="bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-xl font-semibold">Add New Property</span>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <div className="bg-white border border-neutral-200 p-6">
              <h2 className="font-medium text-[#1a1a1a] mb-6">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="e.g., Sunrise Gardens Estate or 5 Bedroom Detached Duplex"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 resize-none"
                    placeholder="Detailed description of the property..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Property Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'land' | 'house' })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                  >
                    <option value="house">House</option>
                    <option value="land">Land</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Starting Price (₦) *
                    </label>
                    <input
                      type="number"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                      placeholder="e.g., 450000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Price Label (optional)
                    </label>
                    <input
                      type="text"
                      value={form.priceLabel}
                      onChange={(e) => setForm({ ...form, priceLabel: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                      placeholder="e.g., Per Plot, Starting From"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white border border-neutral-200 p-6">
              <h2 className="font-medium text-[#1a1a1a] mb-2">Property Details</h2>
              <p className="text-sm text-neutral-500 mb-6">Default details for single unit properties. Use variations below for estates with multiple unit types.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {!isLand && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">
                        Bedrooms
                      </label>
                      <input
                        type="number"
                        value={form.bedrooms}
                        onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        value={form.bathrooms}
                        onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">
                        BQ (Boys Quarters)
                      </label>
                      <input
                        type="number"
                        value={form.bq}
                        onChange={(e) => setForm({ ...form, bq: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                <div className={isLand ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Land Size (sqm)
                  </label>
                  <input
                    type="number"
                    value={form.landSize}
                    onChange={(e) => setForm({ ...form, landSize: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Variations */}
            <div className="bg-white border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium text-[#1a1a1a]">Variations (Optional)</h2>
                <button
                  type="button"
                  onClick={addVariation}
                  className="px-3 py-1.5 bg-[#0055CC] text-white text-sm font-medium hover:bg-[#0044aa] transition-colors"
                >
                  + Add Variation
                </button>
              </div>
              <p className="text-sm text-neutral-500 mb-6">
                For estates with multiple unit types or plot sizes. Each variation can have its own price, specs, and availability.
              </p>

              {variations.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-neutral-200">
                  <p className="text-neutral-500 text-sm">No variations added yet.</p>
                  <p className="text-neutral-400 text-xs mt-1">Click &quot;Add Variation&quot; for estates with multiple unit types.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variations.map((variation, index) => (
                    <div key={variation.id} className="border border-neutral-200 p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeVariation(variation.id)}
                        className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
                        Variation {index + 1}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-neutral-500 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={variation.name}
                            onChange={(e) => updateVariation(variation.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                            placeholder="e.g., 3 Bedroom Terrace or 500 sqm Plot"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">
                            Price (₦)
                          </label>
                          <input
                            type="number"
                            value={variation.price}
                            onChange={(e) => updateVariation(variation.id, 'price', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">
                            Units Available
                          </label>
                          <input
                            type="number"
                            value={variation.unitsAvailable}
                            onChange={(e) => updateVariation(variation.id, 'unitsAvailable', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                            placeholder="0"
                          />
                        </div>

                        {!isLand && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">
                                Bedrooms
                              </label>
                              <input
                                type="number"
                                value={variation.bedrooms}
                                onChange={(e) => updateVariation(variation.id, 'bedrooms', e.target.value)}
                                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">
                                Bathrooms
                              </label>
                              <input
                                type="number"
                                value={variation.bathrooms}
                                onChange={(e) => updateVariation(variation.id, 'bathrooms', e.target.value)}
                                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">
                                BQ
                              </label>
                              <input
                                type="number"
                                value={variation.bq}
                                onChange={(e) => updateVariation(variation.id, 'bq', e.target.value)}
                                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                                placeholder="0"
                              />
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">
                            Land Size (sqm)
                          </label>
                          <input
                            type="number"
                            value={variation.landSize}
                            onChange={(e) => updateVariation(variation.id, 'landSize', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">
                            Status
                          </label>
                          <select
                            value={variation.status}
                            onChange={(e) => updateVariation(variation.id, 'status', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                          >
                            <option value="available">Available</option>
                            <option value="pending">Pending</option>
                            <option value="sold">Sold Out</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="bg-white border border-neutral-200 p-6">
              <h2 className="font-medium text-[#1a1a1a] mb-6">Location</h2>
              <div className="space-y-4">
                {/* Google Maps URL Input */}
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Google Maps Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={googleMapsUrl}
                      onChange={(e) => handleGoogleMapsUrl(e.target.value)}
                      className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                      placeholder="Paste Google Maps share link here..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.readText().then(text => {
                          handleGoogleMapsUrl(text)
                        })
                      }}
                      className="px-4 py-3 bg-neutral-100 border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-200 transition-colors"
                      title="Paste from clipboard"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  </div>
                  {locationError && (
                    <p className="text-xs text-red-500 mt-1">{locationError}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    Open Google Maps, find the location, click &quot;Share&quot; → &quot;Copy link&quot; and paste here.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      District *
                    </label>
                    <select
                      value={form.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    >
                      {districts.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Full Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                      placeholder="e.g., 24 Yedseram Street, Maitama, Abuja"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>

                {/* Map Preview */}
                <div className="h-64 border border-neutral-200">
                  <Suspense fallback={<div className="w-full h-full bg-neutral-100" />}>
                    <AbujaMap selectedProperty={previewProperty} />
                  </Suspense>
                </div>
                <p className="text-xs text-neutral-500">
                  Coordinates are auto-filled from Google Maps link. You can also select a district or enter manually.
                </p>
              </div>
            </div>

            {/* Media & Features */}
            <div className="bg-white border border-neutral-200 p-6">
              <h2 className="font-medium text-[#1a1a1a] mb-6">Media & Features</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Image URLs (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={form.images}
                    onChange={(e) => setForm({ ...form, images: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 resize-none font-mono"
                    placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Features (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={form.features}
                    onChange={(e) => setForm({ ...form, features: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 resize-none"
                    placeholder="Swimming Pool&#10;Generator House&#10;Security Post"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Publish Settings */}
              <div className="bg-white border border-neutral-200 p-6">
                <h2 className="font-medium text-[#1a1a1a] mb-6">Publish Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as PropertyForm['status'] })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    >
                      <option value="available">Available</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="w-4 h-4 text-[#0055CC] border-neutral-300 focus:ring-[#0055CC]"
                    />
                    <span className="text-sm text-neutral-600">Featured Property</span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="bg-white border border-neutral-200 p-6">
                {error && (
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0055CC] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#0044aa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Property'}
                </button>
                <Link
                  href="/admin/dashboard"
                  className="block text-center text-sm text-neutral-500 hover:text-neutral-700 mt-4"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
