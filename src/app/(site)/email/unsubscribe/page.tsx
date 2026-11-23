'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function UnsubscribeInner() {
  const token = useSearchParams().get('t') || ''
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [scope, setScope] = useState<'marketing' | 'all'>('marketing')
  const [error, setError] = useState('')
  const go = async () => {
    setState('busy')
    const res = await fetch('/api/email/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, scope }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setState('done')
    else { setError(data.error || 'This link didn’t work'); setState('error') }
  }
  if (state === 'done') {
    return (
      <div role="status">
        <h1 className="text-3xl font-semibold text-ink mb-3">You’ve been unsubscribed</h1>
        <p className="text-neutral-600 mb-6">
          {scope === 'all' ? 'You won’t receive marketing or follow-up emails from us.' : 'You won’t receive property updates or newsletters from us.'} We’ll still email you about anything you book with us, like inspection details.
        </p>
        <Link href={`/email/preferences?t=${encodeURIComponent(token)}`} className="text-brand underline">Changed your mind? Manage your preferences</Link>
      </div>
    )
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold text-ink mb-3">Unsubscribe</h1>
      <p className="text-neutral-600 mb-6">Choose what you’d like to stop receiving.</p>
      <fieldset className="space-y-3 mb-6">
        <legend className="sr-only">What to unsubscribe from</legend>
        <label className="flex items-start gap-3 cursor-pointer"><input type="radio" name="scope" checked={scope === 'marketing'} onChange={() => setScope('marketing')} className="mt-1" />
          <span><span className="font-medium text-ink">Property updates and newsletters</span><br /><span className="text-sm text-neutral-500">New listings, news and offers</span></span></label>
        <label className="flex items-start gap-3 cursor-pointer"><input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} className="mt-1" />
          <span><span className="font-medium text-ink">Everything except essential emails</span><br /><span className="text-sm text-neutral-500">Also stops follow-ups about your enquiries</span></span></label>
      </fieldset>
      {state === 'error' && <p role="alert" className="alert alert-error mb-4">{error}</p>}
      <button onClick={go} disabled={!token || state === 'busy'} className="btn btn-lg btn-brand">{state === 'busy' ? 'Unsubscribing…' : 'Unsubscribe'}</button>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <div className="pt-28 lg:pt-32 pb-24">
      <div className="max-w-xl mx-auto px-6"><Suspense fallback={null}><UnsubscribeInner /></Suspense></div>
    </div>
  )
}
