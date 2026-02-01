'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { districts } from '@/data/properties'

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
  type: 'sale' | 'rent'
  propertyType: 'house' | 'apartment' | 'land' | 'commercial' | 'villa'
  district: string
  address: string
  latitude: string
  longitude: string
  bedrooms: string
  bathrooms: string
  size: string
  images: string
  features: string
  status: 'available' | 'sold' | 'rented' | 'pending'
  featured: boolean
}

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<PropertyForm>({
    title: '',
    description: '',
    price: '',
    priceLabel: '',
    type: 'sale',
    propertyType: 'house',
    district: 'Maitama',
    address: '',
    latitude: '9.0579',
    longitude: '7.4951',
    bedrooms: '',
    bathrooms: '',
    size: '',
    images: '',
    features: '',
    status: 'available',
    featured: false,
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

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
          propertyType: form.propertyType,
          district: form.district,
          address: form.address,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
          size: form.size ? parseInt(form.size) : undefined,
          images: form.images.split('\n').filter(Boolean),
          features: form.features.split('\n').filter(Boolean),
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
    propertyType: form.propertyType,
    address: form.address,
    images: [],
    features: [],
    status: 'available' as const,
    featured: false,
    createdAt: '',
    updatedAt: '',
  }

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
                    placeholder="e.g., 5 Bedroom Detached Duplex with BQ"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Listing Type *
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as 'sale' | 'rent' })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    >
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Property Type *
                    </label>
                    <select
                      value={form.propertyType}
                      onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyForm['propertyType'] })}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    >
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="villa">Villa</option>
                      <option value="land">Land</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Price (₦) *
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
                      placeholder="e.g., Per Annum"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white border border-neutral-200 p-6">
              <h2 className="font-medium text-[#1a1a1a] mb-6">Property Details</h2>
              <div className="grid grid-cols-3 gap-4">
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
                    Size (sqm)
                  </label>
                  <input
                    type="number"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white border border-neutral-200 p-6">
              <h2 className="font-medium text-[#1a1a1a] mb-6">Location</h2>
              <div className="space-y-4">
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
                  Tip: Select a district to auto-fill coordinates, then adjust for the exact location.
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
                      <option value="rented">Rented</option>
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
                  className="w-full py-3 bg-[#1a1a1a] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
