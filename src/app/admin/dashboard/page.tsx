'use client'

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Add01Icon, Analytics01Icon, ArrowRight01Icon, Building03Icon, CallIcon, CheckmarkCircle01Icon, Mail01Icon, Message01Icon, StarIcon } from '@hugeicons/core-free-icons'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Property, ContactInquiry } from '@/lib/types'
import { useAdminUser, canAccess } from '@/components/admin/AdminNav'

interface AnalyticsStats {
  summary: {
    pageViews: number
    uniqueVisitors: number
    uniqueSessions: number
    propertyViews: number
    totalInquiries: number
    totalContactClicks: number
    avgSessionDuration: number
    conversionRate: string
  }
  trafficSources: Record<string, number>
  deviceBreakdown: Record<string, number>
  topPages: { path: string; views: number }[]
  topProperties: { id: string; title: string; district: string; views: number }[]
  topDistricts: { name: string; views: number }[]
  topCountries: { country: string; count: number }[]
  trend: { date: string; views: number; visitors: number; inquiries: number }[]
  funnel: {
    visitors: number
    propertyViews: number
    contactClicks: number
    inquiries: number
  }
  contactMethods: Record<string, number>
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`
}

function maxValue(values: number[]) {
  return Math.max(1, ...values)
}

type TabId = 'properties' | 'inquiries' | 'analytics'
const TABS: { id: TabId; label: string; icon: IconSvgElement }[] = [
  { id: 'properties', label: 'Properties', icon: Building03Icon },
  { id: 'inquiries', label: 'Inquiries', icon: Message01Icon },
  { id: 'analytics', label: 'Traffic', icon: Analytics01Icon },
]

export default function AdminDashboard() {
  const user = useAdminUser()
  const canEdit = canAccess(user, 'admin') // admin or super_admin can add/delete
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('properties')
  const newInquiries = inquiries.filter(i => i.status === 'new').length

  // Keep the open tab in the URL hash so a refresh or shared link lands on the same section
  useEffect(() => {
    const fromHash = window.location.hash.slice(1)
    if (TABS.some(t => t.id === fromHash)) setActiveTab(fromHash as TabId)
  }, [])
  const selectTab = (id: TabId) => {
    setActiveTab(id)
    history.replaceState(null, '', `#${id}`)
  }

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
        const [propertiesRes, inquiriesRes, analyticsRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/inquiries'),
          fetch('/api/analytics/stats?range=30d'),
        ])

        const propertiesData = await propertiesRes.json()
        const inquiriesData = await inquiriesRes.json()
        const analyticsData = await analyticsRes.json().catch(() => null)

        setProperties(Array.isArray(propertiesData) ? propertiesData : [])
        setInquiries(Array.isArray(inquiriesData) ? inquiriesData : [])
        // Analytics is optional - don't show error if it fails (tables may not be set up yet)
        setAnalytics(analyticsRes.ok ? analyticsData : null)
        // Only show error if core data fails - analytics failing is handled gracefully in the UI
        if (!propertiesRes.ok || !inquiriesRes.ok) setLoadError('Some data could not be loaded. Check the database connection, then refresh.')
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
                  {newInquiries}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Dashboard sections" className="flex gap-1 mb-6 border-b border-neutral-200 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const selected = activeTab === t.id
            const count = t.id === 'properties' ? properties.length : t.id === 'inquiries' ? newInquiries : null
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => selectTab(t.id)}
                className={`relative -mb-px h-11 px-4 flex items-center gap-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  selected ? 'border-[#0055cc] text-[#0055cc] font-medium' : 'border-transparent text-neutral-500 hover:text-ink'
                }`}
              >
                <HugeiconsIcon icon={t.icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                {t.label}
                {count !== null && count > 0 && (
                  <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-medium grid place-items-center tabular-nums ${
                    t.id === 'inquiries' ? 'bg-red-50 text-red-600' : selected ? 'bg-blue-50 text-[#0055cc]' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div role="tabpanel" id="panel-properties" aria-labelledby="tab-properties" className="card overflow-hidden">
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
          <div role="tabpanel" id="panel-inquiries" aria-labelledby="tab-inquiries" className="card overflow-hidden">
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

        {activeTab === 'analytics' && (
          <div role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics" className="space-y-6">
            {analytics ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card card-body">
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Page views</p>
                    <p className="text-2xl font-semibold text-ink mt-1">{analytics.summary.pageViews.toLocaleString()}</p>
                  </div>
                  <div className="card card-body">
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Visitors</p>
                    <p className="text-2xl font-semibold text-ink mt-1">{analytics.summary.uniqueVisitors.toLocaleString()}</p>
                  </div>
                  <div className="card card-body">
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Sessions</p>
                    <p className="text-2xl font-semibold text-ink mt-1">{analytics.summary.uniqueSessions.toLocaleString()}</p>
                  </div>
                  <div className="card card-body">
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Avg duration</p>
                    <p className="text-2xl font-semibold text-ink mt-1">{formatDuration(analytics.summary.avgSessionDuration)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="card card-body xl:col-span-2">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <h2 className="font-medium text-ink">Visitor trend</h2>
                        <p className="text-sm text-neutral-500 mt-1">Last 30 days of page views, visitors, and inquiries.</p>
                      </div>
                      <span className="badge badge-info">{analytics.summary.conversionRate}% conversion</span>
                    </div>
                    {analytics.trend.length > 0 ? (
                      <div className="h-56 flex items-end gap-1 border-b border-neutral-100">
                        {analytics.trend.map((day) => {
                          const height = Math.max(8, (day.views / maxValue(analytics.trend.map(item => item.views))) * 100)
                          return (
                            <div key={day.date} className="flex-1 min-w-0 h-full flex flex-col justify-end gap-2 group">
                              <div
                                className="w-full rounded-t-md bg-[#0055cc]/80 group-hover:bg-[#0055cc] transition-colors"
                                style={{ height: `${height}%` }}
                                title={`${day.date}: ${day.views} views, ${day.visitors} visitors, ${day.inquiries} inquiries`}
                              />
                              <span className="hidden sm:block text-[10px] text-neutral-400 truncate">{new Date(day.date).getDate()}</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="h-56 rounded-xl bg-neutral-50 grid place-items-center text-sm text-neutral-400">
                        No visitor trend yet
                      </div>
                    )}
                  </div>

                  <div className="card card-body">
                    <h2 className="font-medium text-ink mb-4">Conversion funnel</h2>
                    {[
                      ['Visitors', analytics.funnel.visitors],
                      ['Property views', analytics.funnel.propertyViews],
                      ['Contact clicks', analytics.funnel.contactClicks],
                      ['Inquiries', analytics.funnel.inquiries],
                    ].map(([label, value]) => (
                      <div key={label} className="mb-4 last:mb-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-600">{label}</span>
                          <span className="font-medium text-ink">{Number(value).toLocaleString()}</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.max(4, (Number(value) / maxValue([analytics.funnel.visitors])) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="card card-body">
                    <h2 className="font-medium text-ink mb-4">Traffic sources</h2>
                    {Object.entries(analytics.trafficSources).length > 0 ? Object.entries(analytics.trafficSources).map(([source, count]) => (
                      <div key={source} className="mb-3 last:mb-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-600">{source}</span>
                          <span className="font-medium text-ink">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full rounded-full bg-[#0055cc]" style={{ width: `${(count / maxValue(Object.values(analytics.trafficSources))) * 100}%` }} />
                        </div>
                      </div>
                    )) : <p className="text-sm text-neutral-400">No traffic source data yet.</p>}
                  </div>

                  <div className="card card-body">
                    <h2 className="font-medium text-ink mb-4">Devices</h2>
                    {Object.entries(analytics.deviceBreakdown).length > 0 ? Object.entries(analytics.deviceBreakdown).map(([device, count]) => (
                      <div key={device} className="mb-3 last:mb-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-600 capitalize">{device}</span>
                          <span className="font-medium text-ink">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(count / maxValue(Object.values(analytics.deviceBreakdown))) * 100}%` }} />
                        </div>
                      </div>
                    )) : <p className="text-sm text-neutral-400">No device data yet.</p>}
                  </div>

                  <div className="card card-body">
                    <h2 className="font-medium text-ink mb-4">Contact actions</h2>
                    {Object.entries(analytics.contactMethods).map(([method, count]) => (
                      <div key={method} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                        <span className="text-sm text-neutral-600 capitalize">{method}</span>
                        <span className="font-medium text-ink">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card overflow-hidden">
                    <div className="card-header">
                      <h2 className="font-medium text-ink">Top pages</h2>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {analytics.topPages.length > 0 ? analytics.topPages.map((page) => (
                        <div key={page.path} className="p-4 flex items-center justify-between gap-4">
                          <span className="text-sm text-neutral-600 truncate">{page.path}</span>
                          <span className="font-medium text-ink">{page.views.toLocaleString()}</span>
                        </div>
                      )) : <div className="p-6 text-sm text-neutral-400">No page data yet.</div>}
                    </div>
                  </div>

                  <div className="card overflow-hidden">
                    <div className="card-header">
                      <h2 className="font-medium text-ink">Top properties</h2>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {analytics.topProperties.length > 0 ? analytics.topProperties.map((property) => (
                        <div key={property.id} className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{property.title}</p>
                            <p className="text-xs text-neutral-400">{property.district}</p>
                          </div>
                          <span className="font-medium text-ink">{property.views.toLocaleString()}</span>
                        </div>
                      )) : <div className="p-6 text-sm text-neutral-400">No property data yet.</div>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="card card-body text-center py-14">
                <p className="text-ink font-medium">Analytics are not available yet</p>
                <p className="text-sm text-neutral-500 mt-2">Run the Supabase analytics migration, then traffic will begin appearing here.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
