'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Confirmation is a button press, not an automatic page load, so email security
// scanners that open every link can't subscribe someone by accident.
function ConfirmInner() {
  const token = useSearchParams().get('t') || ''
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const confirm = async () => {
    setState('busy')
    const res = await fetch('/api/email/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setState('done')
    else { setError(data.error || 'This link didn’t work'); setState('error') }
  }
  if (state === 'done') {
    return (
      <div role="status">
        <h1 className="text-3xl font-semibold text-ink mb-3">You’re subscribed</h1>
        <p className="text-neutral-600 mb-6">Thank you. We’ll only send you updates that match your interests, and every email lets you change that.</p>
        <Link href="/properties" className="btn btn-lg btn-brand">Browse properties</Link>
      </div>
    )
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold text-ink mb-3">Confirm your subscription</h1>
      <p className="text-neutral-600 mb-6">Press the button to start receiving property updates by email.</p>
      {state === 'error' && <p role="alert" className="alert alert-error mb-4">{error}</p>}
      <button onClick={confirm} disabled={!token || state === 'busy'} className="btn btn-lg btn-brand">{state === 'busy' ? 'Confirming…' : 'Yes, subscribe me'}</button>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <div className="pt-28 lg:pt-32 pb-24">
      <div className="max-w-xl mx-auto px-6"><Suspense fallback={null}><ConfirmInner /></Suspense></div>
    </div>
  )
}
