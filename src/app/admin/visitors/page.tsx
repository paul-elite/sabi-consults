'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Globe02Icon, RefreshIcon } from '@hugeicons/core-free-icons'
import { RequireRole } from '@/components/admin/AdminNav'

type Range = '24h' | '7d' | '30d' | '90d'
interface Row { name: string; visits: number; visitors: number; medium?: string }
interface Recent {
  at: string; visitor: string | null; path: string; source: string; medium: string; referrer: string | null; campaign: string | null
  country: string | null; city: string | null; region: string | null; device: string | null; browser: string | null; os: string | null; bot: boolean
}
interface Data {
  range: Range; generatedAt: string; truncated: boolean
  totals: { visits: number; visitors: number; pageLoads: number; countries: number; bots: number | null }
  series: { key: string; visits: number; visitors: number }[]
  sources: Row[]; mediums: Row[]; campaigns: Row[]; countries: Row[]; cities: Row[]; landing: Row[]; devices: Row[]; browsers: Row[]
  recent: Recent[]
}

const RANGES: { id: Range; label: string }[] = [
  { id: '24h', label: '24 hours' }, { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: '90d', label: '90 days' },
]
const MEDIUM: Record<string, { label: string; cls: string }> = {
  search: { label: 'Search', cls: 'bg-blue-50 text-blue-700' },
  social: { label: 'Social', cls: 'bg-pink-50 text-pink-700' },
  messaging: { label: 'Messaging', cls: 'bg-emerald-50 text-emerald-700' },
  referral: { label: 'Website', cls: 'bg-amber-50 text-amber-800' },
  campaign: { label: 'Campaign', cls: 'bg-violet-50 text-violet-700' },
  direct: { label: 'Direct', cls: 'bg-neutral-100 text-neutral-600' },
}
const REFRESH_MS = 30_000

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
const countryName = (code: string | null) => {
  if (!code) return 'Unknown'
  try { return regionNames?.of(code.toUpperCase()) || code } catch { return code }
}
const flag = (code: string | null) =>
  code && /^[A-Z]{2}$/i.test(code) ? String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1a5 + c.charCodeAt(0))) : '🌐'

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}
const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function VisitorsPage() {
  return <RequireRole min="admin"><Visitors /></RequireRole>
}

function Visitors() {
  const [range, setRange] = useState<Range>('7d')
  const [bots, setBots] = useState(false)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await fetch(`/api/visitors?range=${range}&bots=${bots ? 1 : 0}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Couldn’t load visits')
      setData(d); setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load visits')
    } finally {
      setLoading(false)
    }
  }, [range, bots])

  useEffect(() => { load() }, [load])
  // Keep the page live while it's open and visible
  useEffect(() => {
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') load(true) }, REFRESH_MS)
    return () => window.clearInterval(t)
  }, [load])

  const topSource = data?.sources[0]
  const max = useMemo(() => Math.max(1, ...(data?.series.map(s => s.visits) || [1])), [data])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid gap-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Visitors</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Every visit to the website: where people came from, where they are, and the first page they saw.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Time range" className="inline-flex rounded-xl border border-neutral-200 bg-white p-1">
            {RANGES.map(r => (
              <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}
                className={`h-9 px-3 rounded-lg text-sm transition-colors ${range === r.id ? 'bg-[#0055cc] text-white font-medium' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 h-11 px-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-600 cursor-pointer">
            <input id="include-bots" type="checkbox" checked={bots} onChange={e => setBots(e.target.checked)} className="w-4 h-4 accent-[#0055cc]" />
            Include bots
          </label>
          <button type="button" onClick={() => load()} className="h-11 px-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-600 hover:text-ink inline-flex items-center gap-2" aria-label="Refresh now">
            <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      {!data && loading && <div className="h-64 grid place-items-center text-neutral-400 animate-pulse">Loading visits…</div>}

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Visits" value={data.totals.visits.toLocaleString()} hint={`${data.totals.pageLoads.toLocaleString()} page loads`} />
            <Stat label="Unique visitors" value={data.totals.visitors.toLocaleString()} hint="Counted once per browser" />
            <Stat label="Countries" value={data.totals.countries.toLocaleString()} hint={data.countries[0] ? `Most from ${countryName(data.countries[0].name)}` : 'No visits yet'} />
            <Stat label="Top source" value={topSource?.name || '—'} hint={topSource ? `${Math.round((topSource.visits / Math.max(1, data.totals.visits)) * 100)}% of visits` : 'No visits yet'} />
          </div>

          {/* Over time */}
          <section className="card card-body" aria-labelledby="trend-h">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 id="trend-h" className="font-medium text-ink">Visits {data.range === '24h' ? 'by hour' : 'by day'}</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                Live · updated {ago(data.generatedAt)}
              </span>
            </div>
            <div className="h-44 flex items-end gap-[3px] border-b border-neutral-100" role="img"
              aria-label={`Visits ${data.range === '24h' ? 'per hour' : 'per day'}: ${data.series.map(s => `${s.key} ${s.visits}`).join(', ')}`}>
              {data.series.map(s => (
                <div key={s.key} className="flex-1 min-w-0 h-full flex flex-col justify-end group" title={`${s.key.replace('T', ' ')}${data.range === '24h' ? ':00' : ''} · ${s.visits} visits, ${s.visitors} visitors`}>
                  <div className={`w-full rounded-t ${s.visits ? 'bg-[#0055cc]/80 group-hover:bg-[#0055cc]' : 'bg-neutral-100'}`} style={{ height: `${s.visits ? Math.max(4, (s.visits / max) * 100) : 2}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400 mt-2 tabular-nums">
              <span>{data.series[0]?.key.replace('T', ' ')}{data.range === '24h' ? ':00' : ''}</span>
              <span>{data.range === '24h' ? 'now' : 'today'}</span>
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="Where they came from" empty="No visits yet">
              {data.sources.map(s => (
                <Bar key={s.name} total={data.totals.visits} row={s} label={
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{s.name}</span>
                    {s.medium && MEDIUM[s.medium] && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${MEDIUM[s.medium].cls}`}>{MEDIUM[s.medium].label}</span>}
                  </span>
                } />
              ))}
            </Panel>
            <Panel title="Where they are" empty="No location data yet">
              {data.countries.map(c => (
                <Bar key={c.name} total={data.totals.visits} row={c} label={<span className="truncate"><span aria-hidden="true">{flag(c.name)} </span>{countryName(c.name)}</span>} />
              ))}
              {data.cities.length > 0 && (
                <>
                  <p className="pt-3 mt-1 border-t border-neutral-100 text-xs font-medium uppercase tracking-wider text-neutral-400">Cities</p>
                  {data.cities.map(c => <Bar key={c.name} total={data.totals.visits} row={c} label={<span className="truncate">{c.name}</span>} />)}
                </>
              )}
            </Panel>
            <Panel title="First page they saw" empty="No visits yet">
              {data.landing.map(l => <Bar key={l.name} total={data.totals.visits} row={l} label={<span className="truncate font-mono text-[13px]">{l.name}</span>} />)}
            </Panel>
            <Panel title="Devices and browsers" empty="No visits yet">
              {data.devices.map(d => <Bar key={d.name} total={data.totals.visits} row={d} label={<span className="capitalize">{d.name}</span>} />)}
              {data.browsers.length > 0 && (
                <>
                  <p className="pt-3 mt-1 border-t border-neutral-100 text-xs font-medium uppercase tracking-wider text-neutral-400">Browsers</p>
                  {data.browsers.map(b => <Bar key={b.name} total={data.totals.visits} row={b} label={<span>{b.name}</span>} />)}
                </>
              )}
            </Panel>
            {data.campaigns.length > 0 && (
              <Panel title="Campaigns (utm_campaign)" empty="">
                {data.campaigns.map(c => <Bar key={c.name} total={data.totals.visits} row={c} label={<span className="truncate">{c.name}</span>} />)}
              </Panel>
            )}
          </div>

          {/* Visit log */}
          <section className="card overflow-hidden" aria-labelledby="log-h">
            <div className="card-header flex items-center justify-between gap-4">
              <h2 id="log-h" className="font-medium text-ink">Latest visits</h2>
              <span className="text-xs text-neutral-400">Newest first · {data.recent.length} shown</span>
            </div>
            {data.recent.length === 0 ? (
              <div className="p-10 text-center text-sm text-neutral-500">
                <HugeiconsIcon icon={Globe02Icon} className="w-8 h-8 mx-auto mb-3 text-neutral-300" strokeWidth={1.5} aria-hidden="true" />
                No visits in this period yet. They appear here within seconds of someone opening the site.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th scope="col">When</th><th scope="col">Location</th><th scope="col">Came from</th><th scope="col">First page</th><th scope="col">Device</th></tr>
                  </thead>
                  <tbody>
                    {data.recent.map((v, i) => (
                      <tr key={`${v.at}-${i}`}>
                        <td className="whitespace-nowrap"><span title={fmtTime(v.at)}>{ago(v.at)}</span>{v.bot && <span className="ml-2 badge badge-neutral">Bot</span>}</td>
                        <td className="whitespace-nowrap">
                          <span aria-hidden="true">{flag(v.country)} </span>
                          {v.city ? `${v.city}, ` : ''}{countryName(v.country)}
                        </td>
                        <td>
                          <span className="flex items-center gap-2">
                            {v.source}
                            {MEDIUM[v.medium] && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${MEDIUM[v.medium].cls}`}>{MEDIUM[v.medium].label}</span>}
                          </span>
                          {(v.referrer || v.campaign) && <span className="block text-xs text-neutral-400 truncate max-w-[16rem]">{v.campaign ? `Campaign: ${v.campaign}` : v.referrer}</span>}
                        </td>
                        <td className="font-mono text-[13px] max-w-[14rem] truncate">{v.path}</td>
                        <td className="whitespace-nowrap text-neutral-500"><span className="capitalize">{v.device}</span>{v.browser ? ` · ${v.browser}` : ''}{v.os ? ` · ${v.os}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-neutral-400">
            Visits are logged on the server for every page load, so ad blockers don’t hide them. Location comes from the hosting
            network and is accurate to city level. IP addresses are not stored.
            {data.truncated && ' This period has more visits than can be summarised at once; shorten the range for exact totals.'}
          </p>
        </>
      )}
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card card-body min-w-0">
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold text-ink mt-1 truncate tabular-nums">{value}</p>
      <p className="text-xs text-neutral-500 mt-1 truncate">{hint}</p>
    </div>
  )
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const has = Array.isArray(children) ? children.flat().some(Boolean) : !!children
  return (
    <section className="card card-body min-w-0">
      <h2 className="font-medium text-ink mb-4">{title}</h2>
      {has ? <div className="grid gap-2.5">{children}</div> : <p className="text-sm text-neutral-400">{empty}</p>}
    </section>
  )
}

function Bar({ row, total, label }: { row: Row; total: number; label: React.ReactNode }) {
  const pct = Math.round((row.visits / Math.max(1, total)) * 100)
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
        <span className="min-w-0 text-neutral-700">{label}</span>
        <span className="shrink-0 tabular-nums text-ink font-medium">{row.visits.toLocaleString()} <span className="text-neutral-400 font-normal">· {pct}%</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#0055cc]/70" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  )
}
