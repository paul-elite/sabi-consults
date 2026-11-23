'use client'

// Shared building blocks for the admin email & CRM screens.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

export const TABS = [
  { href: '/admin/email', label: 'Overview', exact: true },
  { href: '/admin/email/contacts', label: 'Contacts' },
  { href: '/admin/email/campaigns', label: 'Campaigns' },
  { href: '/admin/email/automations', label: 'Automations' },
  { href: '/admin/email/templates', label: 'Templates' },
  { href: '/admin/email/analytics', label: 'Analytics' },
  { href: '/admin/email/log', label: 'Delivery log' },
  { href: '/admin/email/settings', label: 'Settings' },
]

export function EmailShell({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() || ''
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <nav aria-label="Email sections" className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-6 overflow-x-auto">
        <div className="flex gap-1 border-b border-neutral-200 min-w-max">
          {TABS.map(t => {
            const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + '/')
            return (
              <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined}
                className={`px-3 h-10 inline-flex items-center text-sm border-b-2 -mb-px transition-colors ${active ? 'border-[#0055cc] text-[#0055cc] font-medium' : 'border-transparent text-neutral-500 hover:text-ink'}`}>
                {t.label}
              </Link>
            )
          })}
        </div>
      </nav>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {description && <p className="text-sm text-neutral-500 mt-1 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </main>
  )
}

/** Fetch JSON with loading/error state and a reload function. */
export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!url) return
    setLoading(true)
    try {
      const res = await fetch(url, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setData(body as T); setError('')
    } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading, reload: load, setData }
}

export async function send<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data as T
}

/** Small toast for success/error feedback. */
export function useToast() {
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((kind: 'ok' | 'error', text: string) => {
    setToast({ kind, text })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 7000 : 3500)
  }, [])
  const node = toast ? (
    <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl px-4 py-3 text-sm shadow-lg ${toast.kind === 'error' ? 'bg-red-600 text-white' : 'bg-ink text-white'}`}>
      {toast.text}
    </div>
  ) : null
  return { show, node }
}

export function Stat({ label, value, hint, tone, sub }: { label: string; value: React.ReactNode; hint?: string; tone?: 'muted'; sub?: React.ReactNode }) {
  return (
    <div className="card card-body">
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5" title={hint}>
        {label}{hint && <span aria-hidden="true" className="text-neutral-300 cursor-help">ⓘ</span>}
      </p>
      <p className={`text-2xl font-semibold mt-1 ${tone === 'muted' ? 'text-neutral-400' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
      {hint && <span className="sr-only">{hint}</span>}
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  queued: 'badge-info', sending: 'badge-info', sent: 'badge-success', delivered: 'badge-success',
  bounced: 'badge-danger', complained: 'badge-danger', failed: 'badge-danger', cancelled: 'badge-neutral', skipped: 'badge-neutral',
  draft: 'badge-neutral', scheduled: 'badge-info', paused: 'badge-warning',
  active: 'badge-success', completed: 'badge-neutral', exited: 'badge-neutral',
  subscribed: 'badge-success', pending: 'badge-warning', unsubscribed: 'badge-neutral', none: 'badge-neutral',
  confirmed: 'badge-success', no_show: 'badge-danger',
}
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge ${STATUS_STYLE[status] || 'badge-neutral'} whitespace-nowrap`}>{label || status.replace(/_/g, ' ')}</span>
}

export const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '–')
export const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'
export const fmtDateTime = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–'
export const naira = (n?: number | null) => (n ? `₦${Number(n).toLocaleString('en-NG')}` : '–')
export const humanMinutes = (m: number) => m % 1440 === 0 ? `${m / 1440} day${m === 1440 ? '' : 's'}` : m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${m} min`

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="p-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">{children}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`relative bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost" aria-label="Close">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const preset = (days: number) => {
    const t = new Date(); const f = new Date(Date.now() - days * 86400_000)
    onChange(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10))
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {[7, 30, 90, 365].map(d => <button key={d} type="button" onClick={() => preset(d)} className="btn btn-sm btn-secondary">{d === 365 ? '12 months' : `${d} days`}</button>)}
      <label className="sr-only" htmlFor="dr-from">From</label>
      <input id="dr-from" type="date" value={from} onChange={e => onChange(e.target.value, to)} className="form-input h-9 py-0 w-auto" />
      <span className="text-neutral-400">to</span>
      <label className="sr-only" htmlFor="dr-to">To</label>
      <input id="dr-to" type="date" value={to} onChange={e => onChange(from, e.target.value)} className="form-input h-9 py-0 w-auto" />
    </div>
  )
}

export const defaultRange = () => ({ from: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) })

/** Renders an email's HTML in a sandboxed frame at phone or desktop width. */
export function EmailPreview({ html, subject, preheader }: { html: string; subject?: string; preheader?: string }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          {subject && <p className="text-sm font-medium text-ink truncate">{subject}</p>}
          {preheader && <p className="text-xs text-neutral-500 truncate">{preheader}</p>}
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-neutral-100 text-xs shrink-0" role="radiogroup" aria-label="Preview width">
          {(['desktop', 'mobile'] as const).map(d => (
            <button key={d} type="button" role="radio" aria-checked={device === d} onClick={() => setDevice(d)}
              className={`px-3 h-7 rounded-md capitalize ${device === d ? 'bg-white shadow-sm text-ink' : 'text-neutral-500'}`}>{d}</button>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-neutral-100 p-3 flex justify-center">
        <iframe title="Email preview" sandbox="" srcDoc={html} className="bg-white rounded-lg border border-neutral-200 transition-all"
          style={{ width: device === 'mobile' ? 380 : '100%', maxWidth: '100%', height: 640 }} />
      </div>
    </div>
  )
}

export const AUDIENCE_LABEL: Record<string, string> = {
  transactional: 'Transactional (always sent)',
  service: 'Follow-up (until opted out)',
  marketing: 'Marketing (needs consent)',
  internal: 'Team notification',
}
