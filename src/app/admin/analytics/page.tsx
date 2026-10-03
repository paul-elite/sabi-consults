'use client'

import { useState, useEffect } from 'react'
import { RequireRole } from '@/components/admin/AdminNav'
import Link from 'next/link'

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
  contactMethods: {
    whatsapp: number
    phone: number
    email: number
    form: number
  }
  dateRange: { start: string; end: string }
}

type DateRange = '24h' | '7d' | '30d' | '90d' | 'all'

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function StatCard({ label, value, subValue, icon, color = 'neutral' }: {
  label: string; value: string | number; subValue?: string; icon: React.ReactNode; color?: string
}) {
  const colorClasses: Record<string, string> = {
    neutral: 'bg-neutral-100 text-neutral-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    brand: 'bg-brand-soft text-brand',
  }

  return (
    <div className="card card-body">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-semibold text-ink">{value}</p>
          {subValue && <p className="text-xs text-neutral-500">{subValue}</p>}
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ value, max, label, color = 'brand' }: {
  value: number; max: number; label: string; color?: string
}) {
  const percent = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-600 w-24 truncate">{label}</span>
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color === 'brand' ? 'bg-brand' : `bg-${color}-500`}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-ink w-12 text-right">{formatNumber(value)}</span>
    </div>
  )
}

function AnalyticsDashboard() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<DateRange>('7d')

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/analytics/stats?range=${range}`)
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const data = await res.json()
        setStats(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [range])

  const rangeLabels: Record<DateRange, string> = {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    'all': 'All time',
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="animate-pulse text-neutral-400">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-sm text-neutral-500 mb-4">
          Make sure the analytics tables are created in Supabase.
        </p>
        <Link href="/admin/dashboard" className="btn btn-md btn-primary">Back to Dashboard</Link>
      </div>
    )
  }

  if (!stats) return null

  const maxSource = Math.max(...Object.values(stats.trafficSources), 1)
  const maxDevice = Math.max(...Object.values(stats.deviceBreakdown), 1)
  const maxContact = Math.max(...Object.values(stats.contactMethods), 1)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-light text-ink">Analytics</h1>
          <p className="text-sm text-neutral-500 mt-1">Track your website performance and visitor behavior</p>
        </div>
        <div className="flex items-center gap-2">
          {(Object.keys(rangeLabels) as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Page Views"
          value={formatNumber(stats.summary.pageViews)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
          color="blue"
        />
        <StatCard
          label="Unique Visitors"
          value={formatNumber(stats.summary.uniqueVisitors)}
          subValue={`${stats.summary.uniqueSessions} sessions`}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          color="emerald"
        />
        <StatCard
          label="Property Views"
          value={formatNumber(stats.summary.propertyViews)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          color="brand"
        />
        <StatCard
          label="Inquiries"
          value={stats.summary.totalInquiries}
          subValue={`${stats.summary.conversionRate}% conversion`}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          color="amber"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* Traffic Trend */}
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Traffic Trend</h2>
            {stats.trend.length > 0 ? (
              <div className="space-y-1">
                {stats.trend.slice(-14).map((day, i) => {
                  const maxViews = Math.max(...stats.trend.map(d => d.views), 1)
                  const percent = (day.views / maxViews) * 100
                  return (
                    <div key={day.date} className="flex items-center gap-2 text-sm">
                      <span className="w-20 text-neutral-500 shrink-0">
                        {new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex-1 h-5 bg-neutral-50 rounded overflow-hidden">
                        <div
                          className="h-full bg-brand/20 flex items-center px-2"
                          style={{ width: `${Math.max(percent, 5)}%` }}
                        >
                          <span className="text-xs font-medium text-brand">{day.views}</span>
                        </div>
                      </div>
                      {day.inquiries > 0 && (
                        <span className="badge badge-success shrink-0">{day.inquiries} inquiry</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">No data for this period</p>
            )}
          </div>

          {/* Top Properties */}
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Top Properties</h2>
            {stats.topProperties.length > 0 ? (
              <div className="space-y-3">
                {stats.topProperties.slice(0, 5).map((prop, i) => (
                  <div key={prop.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 text-xs font-medium flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/properties/${prop.id}`} className="font-medium text-ink hover:text-brand truncate block">
                        {prop.title}
                      </Link>
                      <p className="text-xs text-neutral-500">{prop.district}</p>
                    </div>
                    <span className="text-sm font-medium text-ink">{formatNumber(prop.views)} views</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">No property views yet</p>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Conversion Funnel</h2>
            <div className="space-y-3">
              {[
                { label: 'Visitors', value: stats.funnel.visitors, color: 'bg-blue-500' },
                { label: 'Viewed Properties', value: stats.funnel.propertyViews, color: 'bg-purple-500' },
                { label: 'Clicked Contact', value: stats.funnel.contactClicks, color: 'bg-amber-500' },
                { label: 'Sent Inquiry', value: stats.funnel.inquiries, color: 'bg-emerald-500' },
              ].map((stage, i) => {
                const maxVal = stats.funnel.visitors || 1
                const percent = (stage.value / maxVal) * 100
                return (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-neutral-600">{stage.label}</span>
                      <span className="font-medium text-ink">{formatNumber(stage.value)}</span>
                    </div>
                    <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full ${stage.color} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                    {i > 0 && stats.funnel.visitors > 0 && (
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {((stage.value / stats.funnel.visitors) * 100).toFixed(1)}% of visitors
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Breakdowns */}
        <div className="space-y-6">
          {/* Traffic Sources */}
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Traffic Sources</h2>
            <div className="space-y-2">
              {Object.entries(stats.trafficSources)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([source, count]) => (
                  <ProgressBar key={source} label={source} value={count} max={maxSource} />
                ))}
              {Object.keys(stats.trafficSources).length === 0 && (
                <p className="text-neutral-500 text-sm">No data yet</p>
              )}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Devices</h2>
            <div className="space-y-2">
              {Object.entries(stats.deviceBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([device, count]) => (
                  <ProgressBar key={device} label={device} value={count} max={maxDevice} />
                ))}
              {Object.keys(stats.deviceBreakdown).length === 0 && (
                <p className="text-neutral-500 text-sm">No data yet</p>
              )}
            </div>
          </div>

          {/* Contact Methods */}
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Contact Methods</h2>
            <div className="space-y-2">
              <ProgressBar label="WhatsApp" value={stats.contactMethods.whatsapp} max={maxContact} />
              <ProgressBar label="Phone" value={stats.contactMethods.phone} max={maxContact} />
              <ProgressBar label="Email" value={stats.contactMethods.email} max={maxContact} />
              <ProgressBar label="Form" value={stats.contactMethods.form} max={maxContact} />
            </div>
          </div>

          {/* Top Districts */}
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Popular Districts</h2>
            <div className="space-y-2">
              {stats.topDistricts.slice(0, 5).map(d => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">{d.name}</span>
                  <span className="font-medium text-ink">{formatNumber(d.views)}</span>
                </div>
              ))}
              {stats.topDistricts.length === 0 && (
                <p className="text-neutral-500 text-sm">No data yet</p>
              )}
            </div>
          </div>

          {/* Top Countries */}
          {stats.topCountries.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-ink mb-4">Visitor Locations</h2>
              <div className="space-y-2">
                {stats.topCountries.slice(0, 5).map(c => (
                  <div key={c.country} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">{c.country}</span>
                    <span className="font-medium text-ink">{formatNumber(c.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return <RequireRole min="admin"><AnalyticsDashboard /></RequireRole>
}
