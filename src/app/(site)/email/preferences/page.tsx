'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Prefs {
  email: string; name: string | null; marketing: string; followups: boolean; frequency: string
  interests: { types?: string[]; districts?: string[]; maxBudget?: number | null; bedrooms?: number | null }
  alerts: { id: string; active: boolean; property: { id: string; title: string } | null; summary: string | null }[]
}

function PreferencesInner() {
  const token = useSearchParams().get('t') || ''
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [districts, setDistricts] = useState('')

  const load = async () => {
    const res = await fetch(`/api/email/preferences?t=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'This link is invalid'); return }
    setPrefs(data)
    setDistricts((data.interests?.districts || []).join(', '))
  }
  useEffect(() => { if (token) load(); else setError('This link is missing its code. Use the link from one of our emails.') }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch: Record<string, unknown>, message = 'Saved') => {
    setBusy(true); setSaved('')
    const res = await fetch('/api/email/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, ...patch }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error || 'Could not save'); return }
    setSaved(message)
    await load()
  }

  if (error) return <p role="alert" className="text-neutral-700">{error}</p>
  if (!prefs) return <p className="text-neutral-400 animate-pulse">Loading your preferences…</p>
  const subscribed = prefs.marketing === 'subscribed'
  const types = prefs.interests.types || []

  return (
    <div className="space-y-8">
      <p className="text-neutral-600">Email preferences for <strong className="text-ink">{prefs.email}</strong></p>
      {saved && <p role="status" className="rounded-lg bg-green-50 text-green-800 px-4 py-3 text-sm">{saved}</p>}

      <section className="rounded-xl border border-neutral-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ink">Property updates and news</h2>
        <p className="text-sm text-neutral-600">New listings that match your interests, newsletters and occasional offers.</p>
        <div className="flex flex-wrap gap-3 items-center">
          <span className={`badge ${subscribed ? 'badge-success' : 'badge-neutral'}`}>{subscribed ? 'Subscribed' : prefs.marketing === 'pending' ? 'Waiting for confirmation' : 'Not subscribed'}</span>
          {subscribed
            ? <button disabled={busy} onClick={() => save({ marketing: false }, 'You’ve been unsubscribed from property updates and news.')} className="btn btn-sm btn-secondary">Unsubscribe</button>
            : <button disabled={busy} onClick={() => save({ marketing: true }, 'You’re subscribed.')} className="btn btn-sm btn-brand">Subscribe</button>}
        </div>
        {subscribed && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="form-field">
              <label htmlFor="freq" className="form-label">How often</label>
              <select id="freq" className="form-select" value={prefs.frequency} onChange={e => save({ frequency: e.target.value })}>
                <option value="instant">As new listings arrive</option>
                <option value="weekly">Weekly summary</option>
                <option value="important_only">Only important updates</option>
              </select>
            </div>
            <fieldset className="form-field">
              <legend className="form-label">Property types</legend>
              <div className="flex gap-4 pt-2">
                {[['house', 'Houses'], ['land', 'Land']].map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={types.includes(v)} onChange={e => save({ interests: { ...prefs.interests, types: e.target.checked ? [...types, v] : types.filter(t => t !== v) } })} /> {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="form-field sm:col-span-2">
              <label htmlFor="dist" className="form-label">Areas (separate with commas)</label>
              <div className="flex gap-2">
                <input id="dist" className="form-input" value={districts} onChange={e => setDistricts(e.target.value)} placeholder="e.g. Gwarinpa, Lokogoma" />
                <button className="btn btn-md btn-secondary shrink-0" disabled={busy}
                  onClick={() => save({ interests: { ...prefs.interests, districts: districts.split(',').map(s => s.trim()).filter(Boolean) } })}>Save</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-ink">Follow-ups about your enquiries</h2>
        <p className="text-sm text-neutral-600">Occasional emails about properties you’ve asked about, such as price changes or a check-in after an inspection.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.followups} disabled={busy} onChange={e => save({ followups: e.target.checked })} /> Send me these follow-ups
        </label>
      </section>

      {prefs.alerts.length > 0 && (
        <section className="rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-ink mb-3">Your alerts</h2>
          <ul className="divide-y divide-neutral-100">
            {prefs.alerts.map(a => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <span>
                  {a.property ? <>Updates on <Link className="text-brand underline" href={`/properties/${a.property.id}`}>{a.property.title}</Link></> : a.summary}
                  {!a.active && <span className="ml-2 text-neutral-400">(not active)</span>}
                </span>
                <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => save({ removeAlert: a.id }, 'Alert removed')}>Remove</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-neutral-500">
        Emails about things you’ve booked or bought (confirmations, inspection details, payment receipts) are always sent, because they’re part of the service you asked for.
        <br /><button className="underline mt-2" disabled={busy} onClick={() => save({ marketing: false, followups: false }, 'You won’t receive any more marketing or follow-up emails.')}>Unsubscribe from everything except those</button>
      </p>
    </div>
  )
}

export default function PreferencesPage() {
  return (
    <div className="pt-24 lg:pt-28 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl font-semibold text-ink mb-6">Your email preferences</h1>
        <Suspense fallback={<p className="text-neutral-400">Loading…</p>}><PreferencesInner /></Suspense>
      </div>
    </div>
  )
}
