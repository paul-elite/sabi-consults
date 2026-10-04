'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Message01Icon, UserGroupIcon, TrendUp01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

import { useState, useEffect } from 'react'
import { RequireRole } from '@/components/admin/AdminNav'
import Link from 'next/link'
import { DISTRICTS } from '@/lib/districts'

interface AnalyticsStats {
  summary: {
    pageViews: number
    uniqueVisitors: number
    propertyViews: number
    totalInquiries: number
    conversionRate: string
  }
  topDistricts: { name: string; views: number }[]
  topProperties: { id: string; title: string; district: string; views: number }[]
  trend: { date: string; views: number; inquiries: number }[]
  funnel: {
    visitors: number
    propertyViews: number
    contactClicks: number
    inquiries: number
  }
}

type DateRange = '7d' | '30d' | '90d'

export default function AnalyticsPage() {
  return <RequireRole min="admin"><AnalyticsDashboard /></RequireRole>
}

function AnalyticsDashboard() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('30d')

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const res = await fetch(`/api/analytics/stats?range=${range}`)
        if (res.ok) setStats(await res.json())
      } catch {
        // Silent fail - show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [range])

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  const conversionRate = stats ? parseFloat(stats.summary.conversionRate) || 0 : 0
  const districtHeat = new Map(stats?.topDistricts.map(d => [d.name, d.views]) || [])
  const maxViews = Math.max(...(stats?.topDistricts.map(d => d.views) || [1]), 1)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                range === r ? 'bg-ink text-white' : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <HugeiconsIcon icon={Message01Icon} className="w-5 h-5 text-emerald-600" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Leads</p>
              <p className="text-2xl font-semibold text-ink">{stats?.summary.totalInquiries || 0}</p>
            </div>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-brand hover:underline flex items-center gap-1">
            View inquiries <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5 text-blue-600" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Visitors</p>
              <p className="text-2xl font-semibold text-ink">{stats?.summary.uniqueVisitors || 0}</p>
            </div>
          </div>
          <p className="text-sm text-neutral-400">{stats?.summary.propertyViews || 0} property views</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <HugeiconsIcon icon={TrendUp01Icon} className="w-5 h-5 text-amber-600" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Conversion</p>
              <p className="text-2xl font-semibold text-ink">{conversionRate.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-sm text-neutral-400">
            {conversionRate >= 5 ? 'Above average' : conversionRate >= 2 ? 'Average' : 'Room to grow'}
          </p>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* District Heat Map */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-medium text-ink mb-4">Interest by District</h2>
          <div className="aspect-[4/3] bg-neutral-50 rounded-xl relative overflow-hidden">
            <svg viewBox="0 0 400 300" className="w-full h-full">
              {/* Simple Abuja district map */}
              {DISTRICTS.map((district) => {
                const views = districtHeat.get(district.name) || 0
                const intensity = maxViews > 0 ? views / maxViews : 0
                const fill = views > 0
                  ? `rgba(0, 85, 204, ${0.15 + intensity * 0.6})`
                  : '#f5f5f5'

                return (
                  <g key={district.name}>
                    <circle
                      cx={district.mapX}
                      cy={district.mapY}
                      r={18 + intensity * 12}
                      fill={fill}
                      stroke={views > 0 ? 'rgba(0, 85, 204, 0.3)' : '#e5e5e5'}
                      strokeWidth={1}
                      className="transition-all duration-300"
                    />
                    <text
                      x={district.mapX}
                      y={district.mapY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[8px] font-medium fill-neutral-600 pointer-events-none"
                    >
                      {district.name.length > 10 ? district.name.slice(0, 8) + '...' : district.name}
                    </text>
                    {views > 0 && (
                      <text
                        x={district.mapX}
                        y={district.mapY + 12}
                        textAnchor="middle"
                        className="text-[7px] font-semibold fill-brand pointer-events-none"
                      >
                        {views}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
          <p className="text-xs text-neutral-400 mt-3 text-center">
            Bubble size and color intensity indicate visitor interest
          </p>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Hot Districts */}
          <div className="card p-5">
            <h2 className="font-medium text-ink mb-4">Top Districts</h2>
            {stats?.topDistricts && stats.topDistricts.length > 0 ? (
              <div className="space-y-3">
                {stats.topDistricts.slice(0, 5).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                      i === 0 ? 'bg-brand-soft text-brand' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-neutral-700 truncate">{d.name}</span>
                    <span className="text-sm font-medium text-ink">{d.views}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-4">No data yet</p>
            )}
          </div>

          {/* Top Properties */}
          <div className="card p-5">
            <h2 className="font-medium text-ink mb-4">Hot Properties</h2>
            {stats?.topProperties && stats.topProperties.length > 0 ? (
              <div className="space-y-3">
                {stats.topProperties.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/properties/${p.id}`}
                    className="block p-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-ink truncate">{p.title}</p>
                    <p className="text-xs text-neutral-400">{p.district} · {p.views} views</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-4">No data yet</p>
            )}
          </div>

          {/* Simple Funnel */}
          <div className="card p-5">
            <h2 className="font-medium text-ink mb-4">Funnel</h2>
            {stats?.funnel ? (
              <div className="space-y-2">
                {[
                  { label: 'Visitors', value: stats.funnel.visitors },
                  { label: 'Viewed', value: stats.funnel.propertyViews },
                  { label: 'Contacted', value: stats.funnel.contactClicks },
                  { label: 'Inquired', value: stats.funnel.inquiries },
                ].map((stage, i) => {
                  const width = stats.funnel.visitors > 0
                    ? Math.max(10, (stage.value / stats.funnel.visitors) * 100)
                    : 100
                  return (
                    <div key={stage.label} className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500 w-16">{stage.label}</span>
                      <div className="flex-1 h-5 bg-neutral-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-brand/20 flex items-center justify-end px-2"
                          style={{ width: `${width}%` }}
                        >
                          <span className="text-[10px] font-medium text-brand">{stage.value}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
