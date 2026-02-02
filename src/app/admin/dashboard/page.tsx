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

        setProperties(propertiesData)
        setInquiries(inquiriesData)
      } catch {
        console.error('Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin')
  }

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
    <div className="min-h-screen">
      {/* Admin Header */}
      <header className="bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin/dashboard" className="text-xl font-semibold">
              Sabi<span className="text-[#0055CC]">Consults</span>
              <span className="text-xs font-normal text-neutral-400 ml-2">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/blog" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/admin/settings" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Settings
            </Link>
            <Link href="/" target="_blank" className="text-sm text-neutral-400 hover:text-white transition-colors">
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-neutral-200 p-6">
            <p className="text-sm text-neutral-500 mb-1">Total Properties</p>
            <p className="text-3xl font-light text-[#1a1a1a]">{properties.length}</p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <p className="text-sm text-neutral-500 mb-1">Available</p>
            <p className="text-3xl font-light text-[#1a1a1a]">
              {properties.filter(p => p.status === 'available').length}
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <p className="text-sm text-neutral-500 mb-1">Featured</p>
            <p className="text-3xl font-light text-[#1a1a1a]">
              {properties.filter(p => p.featured).length}
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <p className="text-sm text-neutral-500 mb-1">New Inquiries</p>
            <p className="text-3xl font-light text-[#1a1a1a]">
              {inquiries.filter(i => i.status === 'new').length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'properties'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-neutral-600 hover:text-[#1a1a1a]'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'inquiries'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-neutral-600 hover:text-[#1a1a1a]'
            }`}
          >
            Inquiries
            {inquiries.filter(i => i.status === 'new').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {inquiries.filter(i => i.status === 'new').length}
              </span>
            )}
          </button>
        </div>

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="bg-white border border-neutral-200">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="font-medium text-[#1a1a1a]">All Properties</h2>
              <Link
                href="/admin/properties/new"
                className="px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#2d2d2d] transition-colors"
              >
                Add Property
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      District
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {property.images[0] && (
                            <img
                              src={property.images[0]}
                              alt=""
                              className="w-12 h-12 object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-[#1a1a1a] text-sm">{property.title}</p>
                            {property.featured && (
                              <span className="text-xs text-[#0055CC]">Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600">{property.district}</td>
                      <td className="px-4 py-4 text-sm text-neutral-600 capitalize">
                        {property.type === 'land' ? 'Land' : 'House'}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600">
                        ₦{(property.price / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs font-medium uppercase ${
                          property.status === 'available'
                            ? 'bg-green-100 text-green-700'
                            : property.status === 'sold'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {property.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/properties/${property.id}`}
                            className="text-sm text-[#0055CC] hover:underline"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="text-sm text-red-600 hover:underline"
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
          <div className="bg-white border border-neutral-200">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="font-medium text-[#1a1a1a]">Contact Inquiries</h2>
            </div>
            {inquiries.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-[#1a1a1a]">{inquiry.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium uppercase ${
                            inquiry.status === 'new'
                              ? 'bg-blue-100 text-blue-700'
                              : inquiry.status === 'contacted'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {inquiry.status}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 mb-2">
                          {inquiry.email} • {inquiry.phone}
                        </p>
                        <p className="text-sm text-neutral-600">{inquiry.message}</p>
                        {inquiry.propertyId && (
                          <p className="text-xs text-[#0055CC] mt-2">
                            Property ID: {inquiry.propertyId}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-neutral-400">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500">
                No inquiries yet.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
