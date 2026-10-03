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
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Properties</p>
                <p className="text-2xl font-semibold text-ink">{properties.length}</p>
              </div>
            </div>
          </div>
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Available</p>
                <p className="text-2xl font-semibold text-emerald-600">
                  {properties.filter(p => p.status === 'available').length}
                </p>
              </div>
            </div>
          </div>
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center text-brand">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Featured</p>
                <p className="text-2xl font-semibold text-brand">
                  {properties.filter(p => p.featured).length}
                </p>
              </div>
            </div>
          </div>
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">New Inquiries</p>
                <p className="text-2xl font-semibold text-amber-600">
                  {inquiries.filter(i => i.status === 'new').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('properties')}
            aria-pressed={activeTab === 'properties'}
            className={`btn btn-md ${
              activeTab === 'properties'
                ? 'bg-[#0055cc] text-white hover:bg-[#0044a3]'
                : 'btn-secondary'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            aria-pressed={activeTab === 'inquiries'}
            className={`btn btn-md ${
              activeTab === 'inquiries'
                ? 'bg-[#0055cc] text-white hover:bg-[#0044a3]'
                : 'btn-secondary'
            }`}
          >
            Inquiries
            {inquiries.filter(i => i.status === 'new').length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${activeTab === 'inquiries' ? 'bg-white/20' : 'badge-danger'}`}>
                {inquiries.filter(i => i.status === 'new').length}
              </span>
            )}
          </button>
        </div>

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-medium text-ink">All Properties</h2>
              <Link href="/admin/properties/new" className="btn btn-md btn-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Property
              </Link>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>District</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {property.images[0] && (
                            <img
                              src={property.images[0]}
                              alt=""
                              className="w-11 h-11 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-medium text-ink">{property.title}</p>
                            {property.featured && (
                              <span className="badge badge-brand mt-0.5">Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-neutral-600">{property.district}</td>
                      <td className="text-neutral-600">
                        {property.type === 'land' ? 'Land' : 'House'}
                      </td>
                      <td className="font-medium text-neutral-700">
                        ₦{(property.price / 1000000).toFixed(1)}M
                      </td>
                      <td>
                        <span className={`badge ${
                          property.status === 'available'
                            ? 'badge-success'
                            : property.status === 'sold'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}>
                          {property.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/properties/${property.id}`}
                            className="btn btn-sm btn-ghost"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="btn btn-sm btn-danger-ghost"
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
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="font-medium text-ink">Contact Inquiries</h2>
            </div>
            {inquiries.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="p-5 hover:bg-neutral-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-ink">{inquiry.name}</h3>
                          <span className={`badge ${
                            inquiry.status === 'new'
                              ? 'badge-info'
                              : inquiry.status === 'contacted'
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}>
                            {inquiry.status}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 mb-2 flex items-center gap-2">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {inquiry.email}
                          </span>
                          <span className="text-neutral-300">·</span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {inquiry.phone}
                          </span>
                        </p>
                        <p className="text-sm text-neutral-600 leading-relaxed">{inquiry.message}</p>
                        {inquiry.propertyId && (
                          <Link href={`/admin/properties/${inquiry.propertyId}`} className="text-sm text-brand hover:underline mt-3 inline-flex items-center gap-1">
                            View property
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 whitespace-nowrap">
                        {new Date(inquiry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-neutral-500">No inquiries yet</p>
                <p className="text-sm text-neutral-400 mt-1">Inquiries from your website will appear here</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
