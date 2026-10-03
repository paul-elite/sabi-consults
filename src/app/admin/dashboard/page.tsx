'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, ArrowRight01Icon, Building03Icon, CallIcon, CheckmarkCircle01Icon, Mail01Icon, Message01Icon, StarIcon } from '@hugeicons/core-free-icons'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Property, ContactInquiry } from '@/lib/types'
import { useAdminUser, canAccess } from '@/components/admin/AdminNav'

export default function AdminDashboard() {
  const user = useAdminUser()
  const canEdit = canAccess(user, 'admin') // admin or super_admin can add/delete
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
                <HugeiconsIcon icon={Building03Icon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
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
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
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
                <HugeiconsIcon icon={StarIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
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
                <HugeiconsIcon icon={Message01Icon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
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
              {canEdit && (
                <Link href="/admin/properties/new" className="btn btn-md btn-primary">
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  Add Property
                </Link>
              )}
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
                          {canEdit ? (
                            <>
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
                            </>
                          ) : (
                            <Link
                              href={`/properties/${property.id}`}
                              target="_blank"
                              className="btn btn-sm btn-ghost"
                            >
                              View
                            </Link>
                          )}
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
                            <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" strokeWidth={1.7} aria-hidden="true" />
                            {inquiry.email}
                          </span>
                          <span className="text-neutral-300">·</span>
                          <span className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={CallIcon} className="w-3.5 h-3.5" strokeWidth={1.7} aria-hidden="true" />
                            {inquiry.phone}
                          </span>
                        </p>
                        <p className="text-sm text-neutral-600 leading-relaxed">{inquiry.message}</p>
                        {inquiry.propertyId && (
                          <Link href={`/admin/properties/${inquiry.propertyId}`} className="text-sm text-brand hover:underline mt-3 inline-flex items-center gap-1">
                            View property
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={1.7} aria-hidden="true" />
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
                <HugeiconsIcon icon={Message01Icon} className="w-12 h-12 mx-auto text-neutral-300 mb-4" strokeWidth={1.7} aria-hidden="true" />
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
