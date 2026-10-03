'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Property, ContactInquiry } from '@/lib/types'

export default function AdminDashboard() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<'properties' | 'inquiries'>('properties')

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        // Check auth
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.authenticated) {
          router.push('/admin')
          return
        }

        // Fetch data
        const [propertiesRes, inquiriesRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/inquiries'),
        ])

        const propertiesData = await propertiesRes.json()
        const inquiriesData = await inquiriesRes.json()

        setProperties(Array.isArray(propertiesData) ? propertiesData : [])
        setInquiries(Array.isArray(inquiriesData) ? inquiriesData : [])
        if (!propertiesRes.ok || !inquiriesRes.ok) setLoadError('Some data couldn’t be loaded. Check the database connection, then refresh.')
      } catch {
        console.error('Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router])


  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return

    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProperties(properties.filter(p => p.id !== id))
      }
    } catch {
      alert('Failed to delete property')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <>
      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loadError && <p role="alert" className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{loadError}</p>}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-5">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Properties</p>
            <p className="text-2xl font-semibold text-ink">{properties.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-5">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Available</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {properties.filter(p => p.status === 'available').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-5">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Featured</p>
            <p className="text-2xl font-semibold text-brand">
              {properties.filter(p => p.featured).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-5">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">New Inquiries</p>
            <p className="text-2xl font-semibold text-amber-600">
              {inquiries.filter(i => i.status === 'new').length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'properties'
                ? 'bg-ink text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'inquiries'
                ? 'bg-ink text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Inquiries
            {inquiries.filter(i => i.status === 'new').length > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === 'inquiries' ? 'bg-white/20' : 'bg-red-500 text-white'}`}>
                {inquiries.filter(i => i.status === 'new').length}
              </span>
            )}
          </button>
        </div>

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-medium text-ink">All Properties</h2>
              <Link
                href="/admin/properties/new"
                className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Add Property
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      District
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {property.images[0] && (
                            <img
                              src={property.images[0]}
                              alt=""
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-medium text-ink text-sm">{property.title}</p>
                            {property.featured && (
                              <span className="text-xs text-brand">Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600">{property.district}</td>
                      <td className="px-4 py-4 text-sm text-neutral-600">
                        {property.type === 'land' ? 'Land' : 'House'}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-neutral-700">
                        ₦{(property.price / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          property.status === 'available'
                            ? 'bg-emerald-50 text-emerald-700'
                            : property.status === 'sold'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {property.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/properties/${property.id}`}
                            className="text-sm text-neutral-600 hover:text-ink"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inquiries Tab */}
        {activeTab === 'inquiries' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-4 border-b border-neutral-100">
              <h2 className="font-medium text-ink">Contact Inquiries</h2>
            </div>
            {inquiries.length > 0 ? (
              <div className="divide-y divide-neutral-50">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-ink">{inquiry.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            inquiry.status === 'new'
                              ? 'bg-blue-50 text-blue-700'
                              : inquiry.status === 'contacted'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {inquiry.status}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 mb-2">
                          {inquiry.email} · {inquiry.phone}
                        </p>
                        <p className="text-sm text-neutral-600">{inquiry.message}</p>
                        {inquiry.propertyId && (
                          <Link href={`/admin/properties/${inquiry.propertyId}`} className="text-xs text-brand hover:underline mt-2 inline-block">
                            View property →
                          </Link>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 whitespace-nowrap">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-neutral-400">
                No inquiries yet.
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
