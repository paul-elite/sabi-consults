'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, CallIcon, Mail01Icon, StarIcon, FlameIcon, UserIcon } from '@hugeicons/core-free-icons'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lead, LeadQuality, LeadStatus } from '@/lib/types'
import { RequireRole } from '@/components/admin/AdminNav'

const QUALITY_STYLES: Record<LeadQuality, { bg: string; text: string; icon: typeof StarIcon }> = {
  hot: { bg: 'bg-red-100', text: 'text-red-700', icon: FlameIcon },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700', icon: StarIcon },
  cold: { bg: 'bg-blue-100', text: 'text-blue-700', icon: UserIcon },
}

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'badge-info',
  contacted: 'badge-warning',
  qualified: 'badge-success',
  converted: 'badge-brand',
  lost: 'badge-neutral',
}

function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ quality?: LeadQuality; status?: LeadStatus }>({})

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.authenticated) {
          router.push('/admin')
          return
        }

        const params = new URLSearchParams()
        if (filter.quality) params.set('quality', filter.quality)
        if (filter.status) params.set('status', filter.status)

        const res = await fetch(`/api/leads?${params}`)
        if (res.ok) {
          const data = await res.json()
          setLeads(data)
        }
      } catch (err) {
        console.error('Failed to fetch leads:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router, filter])

  const stats = {
    total: leads.length,
    hot: leads.filter(l => l.quality === 'hot').length,
    warm: leads.filter(l => l.quality === 'warm').length,
    new: leads.filter(l => l.status === 'new').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading leads...</div>
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Leads</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage and follow up with potential clients</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card card-body">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Leads</p>
          <p className="text-2xl font-semibold text-ink mt-1">{stats.total}</p>
        </div>
        <div className="card card-body border-red-100 bg-red-50/30">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Hot Leads</p>
          <p className="text-2xl font-semibold text-red-700 mt-1">{stats.hot}</p>
        </div>
        <div className="card card-body border-amber-100 bg-amber-50/30">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Warm Leads</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{stats.warm}</p>
        </div>
        <div className="card card-body border-blue-100 bg-blue-50/30">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">New Today</p>
          <p className="text-2xl font-semibold text-blue-700 mt-1">{stats.new}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter({})}
          className={`btn btn-sm ${!filter.quality && !filter.status ? 'btn-primary' : 'btn-secondary'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter({ quality: 'hot' })}
          className={`btn btn-sm ${filter.quality === 'hot' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <HugeiconsIcon icon={FlameIcon} className="w-4 h-4" strokeWidth={1.7} />
          Hot
        </button>
        <button
          onClick={() => setFilter({ quality: 'warm' })}
          className={`btn btn-sm ${filter.quality === 'warm' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <HugeiconsIcon icon={StarIcon} className="w-4 h-4" strokeWidth={1.7} />
          Warm
        </button>
        <button
          onClick={() => setFilter({ status: 'new' })}
          className={`btn btn-sm ${filter.status === 'new' ? 'btn-primary' : 'btn-secondary'}`}
        >
          New
        </button>
        <button
          onClick={() => setFilter({ status: 'contacted' })}
          className={`btn btn-sm ${filter.status === 'contacted' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Contacted
        </button>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        {leads.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Quality</th>
                  <th>Source</th>
                  <th>Engagement</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const qualityStyle = QUALITY_STYLES[lead.quality]
                  return (
                    <tr key={lead.id} className="hover:bg-neutral-50">
                      <td>
                        <div>
                          <p className="font-medium text-ink">{lead.name}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-sm text-neutral-500">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={CallIcon} className="w-3.5 h-3.5" strokeWidth={1.7} />
                                {lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" strokeWidth={1.7} />
                                {lead.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${qualityStyle.bg} ${qualityStyle.text}`}>
                          <HugeiconsIcon icon={qualityStyle.icon} className="w-3.5 h-3.5" strokeWidth={1.7} />
                          {lead.quality.toUpperCase()}
                          <span className="ml-1 opacity-60">({lead.score})</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-neutral-600 capitalize">{lead.source || 'Direct'}</span>
                      </td>
                      <td>
                        <div className="text-sm">
                          <span className="text-neutral-700">{lead.totalPropertyViews || 0}</span>
                          <span className="text-neutral-400"> views</span>
                          {lead.totalContactClicks > 0 && (
                            <>
                              <span className="text-neutral-400"> · </span>
                              <span className="text-neutral-700">{lead.totalContactClicks}</span>
                              <span className="text-neutral-400"> clicks</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_STYLES[lead.status]}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="text-sm text-neutral-500">
                        {new Date(lead.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td>
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="btn btn-sm btn-ghost"
                        >
                          View
                          <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.7} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <HugeiconsIcon icon={UserIcon} className="w-12 h-12 mx-auto text-neutral-300 mb-4" strokeWidth={1.5} />
            <p className="text-neutral-500">No leads yet</p>
            <p className="text-sm text-neutral-400 mt-1">
              Leads will appear here when visitors submit their contact information
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function LeadsAdminPage() {
  return <RequireRole min="admin"><LeadsPage /></RequireRole>
}
