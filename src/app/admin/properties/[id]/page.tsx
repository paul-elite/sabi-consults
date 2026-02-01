'use client'

import { useState, useEffect, use, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Property } from '@/lib/types'
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

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    async function fetchProperty() {
      try {
        // Check auth
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.authenticated) {
          router.push('/admin')
          return
        }

        // Fetch property
        const res = await fetch(`/api/properties/${id}`)
        if (!res.ok) {
          throw new Error('Property not found')
        }

        const property: Property = await res.json()
        setForm({
          title: property.title,
          description: property.description,
          price: property.price.toString(),
          priceLabel: property.priceLabel || '',
          type: property.type,
          propertyType: property.propertyType,
          district: property.district,
          address: property.address,
          latitude: property.latitude.toString(),
          longitude: property.longitude.toString(),
          bedrooms: property.bedrooms?.toString() || '',
          bathrooms: property.bathrooms?.toString() || '',
          size: property.size?.toString() || '',
          images: property.images.join('\n'),
          features: property.features.join('\n'),
          status: property.status,
          featured: property.featured,
        })
      } catch {
        setError('Failed to load property')
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
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
        throw new Error(data.error || 'Failed to update property')
      }

      router.push('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property')
    } finally {
      setSaving(false)
    }
  }

  // Preview property for map
  const previewProperty = {
    id: id,
    title: form.title || 'Property',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading property...</div>
      </div>
    )
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
            <span className="text-xl font-semibold">Edit Property</span>
          </div>
          <Link
            href={`/properties/${id}`}
            target="_blank"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            View on Site
          </Link>
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
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
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
                      className="w-4 h-4 text-[#8b7355] border-neutral-300 focus:ring-[#8b7355]"
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
                  disabled={saving}
                  className="w-full py-3 bg-[#1a1a1a] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
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
