'use client'

// Email sign-up forms used across the public site: footer newsletter,
// newsletter page, property alerts and "watch this property".
import { useId, useState } from 'react'
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { Notification01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { getVisitorIdentity } from '@/lib/analytics'

type State = { status: 'idle' | 'loading' | 'done' | 'error'; message?: string; result?: string }

async function post(url: string, body: Record<string, unknown>) {
  const identity = typeof window !== 'undefined' ? getVisitorIdentity() : {}
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, ...body }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

const doneText = (r?: string) => r === 'pending'
  ? 'Almost done: check your inbox and click the link to confirm.'
  : r === 'already' ? 'You’re already subscribed. Thank you!' : 'You’re subscribed. Thank you!'

/* ---------------------------------------------------------------- footer */

export function FooterNewsletter() {
  const uid = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [s, setS] = useState<State>({ status: 'idle' })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setS({ status: 'loading' })
    try {
      const r = await post('/api/email/subscribe', { email, consent, website, source: 'footer' })
      setS({ status: 'done', result: r.status })
    } catch (err) { setS({ status: 'error', message: (err as Error).message }) }
  }
  if (s.status === 'done') return <p role="status" className="text-sm text-on-brand/90">{doneText(s.result)}</p>
  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Newsletter sign-up">
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>
      <label htmlFor={`${uid}-email`} className="sr-only">Email address</label>
      <div className="flex gap-2">
        <input id={`${uid}-email`} type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email"
          className="min-w-0 flex-1 h-11 rounded-lg bg-white/10 border border-on-brand/25 px-3 text-sm text-on-brand placeholder:text-on-brand/50 focus:outline-none focus:border-on-brand/70" />
        <button type="submit" disabled={s.status === 'loading'} className="h-11 px-4 rounded-lg bg-on-brand text-brand text-sm font-semibold disabled:opacity-60 shrink-0">
          {s.status === 'loading' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-on-brand/70 cursor-pointer">
        <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0" />
        <span>I agree to receive new listings and news by email. Unsubscribe any time.</span>
      </label>
      {s.status === 'error' && <p role="alert" className="text-xs text-on-brand">{s.message}</p>}
      <Link href="/newsletter" className="inline-block text-xs text-on-brand/70 underline hover:text-on-brand">Choose what you hear about</Link>
    </form>
  )
}

/* -------------------------------------------------------- newsletter page */

const DISTRICTS = ['Asokoro', 'Maitama', 'Wuse', 'Wuse II', 'Garki', 'Jabi', 'Utako', 'Gwarinpa', 'Katampe', 'Guzape', 'Life Camp', 'Lokogoma', 'Galadimawa', 'Apo', 'Lugbe', 'Kubwa', 'Idu', 'Gaduwa', 'Kukwaba', 'Wuye']

export function NewsletterForm({ districts = DISTRICTS, source = 'newsletter_page' }: { districts?: string[]; source?: string }) {
  const uid = useId()
  const [form, setForm] = useState({ name: '', email: '', types: [] as string[], districts: [] as string[], maxBudget: '', bedrooms: '', frequency: 'instant' })
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [s, setS] = useState<State>({ status: 'idle' })
  const toggle = (k: 'types' | 'districts', v: string) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setS({ status: 'loading' })
    try {
      const r = await post('/api/email/subscribe', {
        email: form.email, name: form.name, consent, website, source, frequency: form.frequency,
        interests: { types: form.types, districts: form.districts, maxBudget: Number(form.maxBudget.replace(/\D/g, '')) || null, bedrooms: Number(form.bedrooms) || null },
      })
      setS({ status: 'done', result: r.status })
    } catch (err) { setS({ status: 'error', message: (err as Error).message }) }
  }
  if (s.status === 'done') {
    return (
      <div role="status" className="rounded-xl border border-neutral-200 p-8 text-center">
        <HugeiconsIcon icon={Tick02Icon} className="w-10 h-10 text-green-600 mx-auto mb-3" strokeWidth={1.7} aria-hidden="true" />
        <p className="font-medium text-ink">{doneText(s.result)}</p>
      </div>
    )
  }
  const chip = (on: boolean) => `px-3 h-9 rounded-full border text-sm transition-colors ${on ? 'bg-brand text-on-brand border-brand' : 'border-neutral-300 text-neutral-700 hover:border-ink'}`
  return (
    <form onSubmit={submit} className="space-y-6">
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-field">
          <label htmlFor={`${uid}-name`} className="form-label">First name <span className="form-label-optional">optional</span></label>
          <input id={`${uid}-name`} className="form-input" autoComplete="given-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-field">
          <label htmlFor={`${uid}-email`} className="form-label">Email address</label>
          <input id={`${uid}-email`} type="email" required className="form-input" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <fieldset>
        <legend className="form-label mb-2">I’m interested in</legend>
        <div className="flex flex-wrap gap-2">
          {[['house', 'Houses'], ['land', 'Land']].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={form.types.includes(v)} onClick={() => toggle('types', v)} className={chip(form.types.includes(v))}>{l}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="form-label mb-2">Areas <span className="form-label-optional">pick any</span></legend>
        <div className="flex flex-wrap gap-2">
          {districts.map(d => (
            <button key={d} type="button" aria-pressed={form.districts.includes(d)} onClick={() => toggle('districts', d)} className={chip(form.districts.includes(d))}>{d}</button>
          ))}
        </div>
      </fieldset>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="form-field">
          <label htmlFor={`${uid}-budget`} className="form-label">Budget up to (₦) <span className="form-label-optional">optional</span></label>
          <input id={`${uid}-budget`} inputMode="numeric" className="form-input" placeholder="e.g. 120,000,000" value={form.maxBudget} onChange={e => setForm({ ...form, maxBudget: e.target.value })} />
        </div>
        <div className="form-field">
          <label htmlFor={`${uid}-beds`} className="form-label">Bedrooms <span className="form-label-optional">optional</span></label>
          <select id={`${uid}-beds`} className="form-select" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })}>
            <option value="">Any</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`${uid}-freq`} className="form-label">How often</label>
          <select id={`${uid}-freq`} className="form-select" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
            <option value="instant">As new listings arrive</option>
            <option value="weekly">Weekly summary</option>
            <option value="important_only">Only important updates</option>
          </select>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-neutral-600 cursor-pointer">
        <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0" />
        <span>I’d like to receive property updates, new listings and news by email. I can unsubscribe at any time.</span>
      </label>
      {s.status === 'error' && <div role="alert" className="alert alert-error">{s.message}</div>}
      <button type="submit" disabled={s.status === 'loading'} className="btn btn-lg btn-brand w-full sm:w-auto">{s.status === 'loading' ? 'Subscribing…' : 'Subscribe'}</button>
    </form>
  )
}

/* ------------------------------------------------------------- alerts */

export function PropertyAlertForm({ propertyId, propertyTitle, criteria, compact }: {
  propertyId?: string; propertyTitle?: string
  criteria?: { types?: string[]; districts?: string[]; maxBudget?: number | null; bedrooms?: number | null }
  compact?: boolean
}) {
  const uid = useId()
  const [open, setOpen] = useState(!compact)
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [s, setS] = useState<State>({ status: 'idle' })
  const label = propertyId ? 'Get price and availability updates' : 'Get alerts for new listings like these'
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setS({ status: 'loading' })
    try {
      const r = await post('/api/email/alerts', { email, website, propertyId, criteria })
      setS({ status: 'done', result: r.status })
    } catch (err) { setS({ status: 'error', message: (err as Error).message }) }
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
        <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> {label}
      </button>
    )
  }
  if (s.status === 'done') {
    return <p role="status" className="text-sm text-neutral-700">{s.result === 'pending' ? 'Check your inbox and click the link to start your alerts.' : 'Done. We’ll email you when something changes.'}</p>
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>
      <label htmlFor={`${uid}-alert`} className="text-sm font-medium text-ink flex items-center gap-2">
        <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4 text-brand" strokeWidth={1.8} aria-hidden="true" /> {label}
      </label>
      <div className="flex gap-2">
        <input id={`${uid}-alert`} type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" className="form-input min-w-0 flex-1" />
        <button type="submit" disabled={s.status === 'loading'} className="btn btn-md btn-secondary shrink-0">{s.status === 'loading' ? '…' : 'Notify me'}</button>
      </div>
      <p className="text-xs text-neutral-500">
        {propertyId ? `We’ll email you if the price of ${propertyTitle || 'this property'} changes or it’s about to go, plus similar listings.` : 'We’ll email you only about matching listings.'} Unsubscribe any time.
      </p>
      {s.status === 'error' && <p role="alert" className="text-sm text-red-600">{s.message}</p>}
    </form>
  )
}

/* ------------------------------------------------------------- guides */

export function GuideRequestForm({ slug, title }: { slug: string; title: string }) {
  const uid = useId()
  const [form, setForm] = useState({ name: '', email: '' })
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [s, setS] = useState<State & { url?: string }>({ status: 'idle' })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setS({ status: 'loading' })
    try {
      const r = await post('/api/email/guides', { slug, ...form, consent, website })
      setS({ status: 'done', url: r.downloadUrl, result: r.subscription })
    } catch (err) { setS({ status: 'error', message: (err as Error).message }) }
  }
  if (s.status === 'done') {
    return (
      <div role="status" className="space-y-2">
        <p className="text-sm text-neutral-700">We’ve emailed you a copy of <strong>{title}</strong>.</p>
        {s.url && <a href={s.url} className="btn btn-md btn-brand">Download now</a>}
        {s.result === 'pending' && <p className="text-xs text-neutral-500">Confirm your subscription from the email we sent.</p>}
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <label htmlFor={`${uid}-n`} className="sr-only">First name</label>
        <input id={`${uid}-n`} className="form-input" placeholder="First name" autoComplete="given-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label htmlFor={`${uid}-e`} className="sr-only">Email address</label>
        <input id={`${uid}-e`} type="email" required className="form-input" placeholder="Email address" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      </div>
      <label className="flex items-start gap-2 text-xs text-neutral-600 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0" />
        <span>Also send me new listings and property tips (optional).</span>
      </label>
      {s.status === 'error' && <p role="alert" className="text-sm text-red-600">{s.message}</p>}
      <button type="submit" disabled={s.status === 'loading'} className="btn btn-md btn-brand">{s.status === 'loading' ? 'Sending…' : 'Get the guide'}</button>
    </form>
  )
}
