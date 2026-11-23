'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Tick02Icon } from '@hugeicons/core-free-icons'

import { useId, useState, useEffect } from 'react'
import { getVisitorIdentity, trackInquiryStarted, trackInquirySubmitted } from '@/lib/analytics'

interface ContactFormProps {
  propertyId?: string
  propertyTitle?: string
  propertyDistrict?: string
  propertyType?: string
  propertyPrice?: number
  /** Contact page: let the visitor say what kind of enquiry this is */
  showType?: boolean
  defaultType?: string
}

// Kept in step with ENQUIRY_TYPES on the server
const TYPES: { value: string; label: string }[] = [
  { value: 'general', label: 'General enquiry' },
  { value: 'consultation', label: 'Book a consultation' },
  { value: 'valuation', label: 'Value my property' },
  { value: 'property_management', label: 'Manage my property' },
  { value: 'owner_listing', label: 'List my property for sale or rent' },
  { value: 'landowner', label: 'I have land to sell' },
  { value: 'developer', label: 'Developer partnership' },
  { value: 'corporate', label: 'Corporate property services' },
]
const BUYER_TYPES = new Set(['general', 'consultation'])

export default function ContactForm({ propertyId, propertyTitle, propertyDistrict, propertyType, propertyPrice, showType, defaultType }: ContactFormProps) {
  const [mode, setMode] = useState<'inspect' | 'question'>('inspect')
  const [enquiryType, setEnquiryType] = useState(TYPES.some(t => t.value === defaultType) ? defaultType! : 'general')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    budget: '',
    location: '',
    preferredDate: '',
    preferredTime: '',
  })
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [reference, setReference] = useState('')
  const [errorText, setErrorText] = useState('')
  const uid = useId()
  const [website, setWebsite] = useState('') // spam trap, hidden from people
  const [hasTrackedStart, setHasTrackedStart] = useState(false)
  const [minDate, setMinDate] = useState('')
  useEffect(() => { setMinDate(new Date(Date.now() + 86400_000).toISOString().slice(0, 10)) }, [])

  const inspecting = !!propertyId && mode === 'inspect'
  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData(f => ({ ...f, [k]: e.target.value }))

  // Build property context for tracking
  const propertyContext = propertyId ? {
    id: propertyId,
    title: propertyTitle,
    district: propertyDistrict,
    type: propertyType,
    price: propertyPrice,
  } : undefined

  // Track when user starts filling the form
  const handleFocus = () => {
    if (!hasTrackedStart) {
      trackInquiryStarted(propertyContext)
      setHasTrackedStart(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const identity = getVisitorIdentity()
      const common = { name: formData.name, email: formData.email, phone: formData.phone, website, marketingConsent: consent, ...identity }
      const response = inspecting
        ? await fetch('/api/viewing-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...common, propertyId, preferredDate: formData.preferredDate || undefined,
            preferredTime: formData.preferredTime || undefined, message: formData.message,
          }),
        })
        : await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...common,
            message: formData.message || (propertyTitle ? `I'm interested in: ${propertyTitle}` : ''),
            propertyId,
            enquiryType: propertyId ? 'property' : enquiryType,
            budget: formData.budget || undefined,
            location: formData.location || undefined,
          }),
        })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Something went wrong')

      // Track successful submission
      trackInquirySubmitted(propertyContext)

      setReference(data.reference || '')
      setStatus('success')
      setFormData({ name: '', email: '', phone: '', message: '', budget: '', location: '', preferredDate: '', preferredTime: '' })
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : '')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6" role="status">
        <HugeiconsIcon icon={Tick02Icon} className="w-12 h-12 text-green-500 mx-auto mb-4" strokeWidth={1.7} aria-hidden="true" />
        <p className="text-ink font-medium mb-2">{inspecting ? 'Inspection request received' : 'Thank you for your enquiry'}</p>
        <p className="text-sm text-neutral-600">
          {inspecting ? 'We’ll call you to confirm the date and time. ' : 'We’ll get back to you shortly. '}
          A confirmation is on its way to your inbox{reference ? <> (reference <strong>{reference}</strong>)</> : null}.
        </p>
        {consent && <p className="text-sm text-neutral-500 mt-2">Check your email to confirm your subscription to property updates.</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>

      {propertyId && (
        <fieldset>
          <legend className="sr-only">What would you like?</legend>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-neutral-100 text-sm" role="radiogroup">
            {([['inspect', 'Book an inspection'], ['question', 'Ask a question']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
                className={`h-10 rounded-md font-medium transition-colors ${mode === v ? 'bg-white text-ink shadow-sm' : 'text-neutral-500 hover:text-ink'}`}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {showType && !propertyId && (
        <div className="form-field">
          <label htmlFor={`${uid}-type`} className="form-label">How can we help?</label>
          <select id={`${uid}-type`} value={enquiryType} onChange={e => setEnquiryType(e.target.value)} className="form-select">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      <div className="form-field">
        <label htmlFor={`${uid}-name`} className="form-label">Full Name</label>
        <input type="text" id={`${uid}-name`} required autoComplete="name" value={formData.name} onChange={set('name')} onFocus={handleFocus} className="form-input" placeholder="Your full name" />
      </div>

      <div className="form-field">
        <label htmlFor={`${uid}-email`} className="form-label">Email Address</label>
        <input type="email" id={`${uid}-email`} required autoComplete="email" value={formData.email} onChange={set('email')} className="form-input" placeholder="you@example.com" />
      </div>

      <div className="form-field">
        <label htmlFor={`${uid}-phone`} className="form-label">Phone Number</label>
        <input type="tel" id={`${uid}-phone`} required autoComplete="tel" value={formData.phone} onChange={set('phone')} className="form-input" placeholder="+234 800 000 0000" />
      </div>

      {inspecting && (
        <div className="grid grid-cols-2 gap-3">
          <div className="form-field">
            <label htmlFor={`${uid}-date`} className="form-label">Preferred date <span className="form-label-optional">optional</span></label>
            <input type="date" id={`${uid}-date`} min={minDate} value={formData.preferredDate} onChange={set('preferredDate')} className="form-input" />
          </div>
          <div className="form-field">
            <label htmlFor={`${uid}-time`} className="form-label">Time of day <span className="form-label-optional">optional</span></label>
            <select id={`${uid}-time`} value={formData.preferredTime} onChange={set('preferredTime')} className="form-select">
              <option value="">Any time</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>
      )}

      {showType && !propertyId && BUYER_TYPES.has(enquiryType) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="form-field">
            <label htmlFor={`${uid}-budget`} className="form-label">Budget <span className="form-label-optional">optional</span></label>
            <input type="text" id={`${uid}-budget`} value={formData.budget} onChange={set('budget')} className="form-input" placeholder="e.g. ₦80M" />
          </div>
          <div className="form-field">
            <label htmlFor={`${uid}-loc`} className="form-label">Preferred area <span className="form-label-optional">optional</span></label>
            <input type="text" id={`${uid}-loc`} value={formData.location} onChange={set('location')} className="form-input" placeholder="e.g. Gwarinpa" />
          </div>
        </div>
      )}

      <div className="form-field">
        <label htmlFor={`${uid}-message`} className="form-label">
          {inspecting ? <>Anything we should know? <span className="form-label-optional">optional</span></> : 'Message'}
        </label>
        <textarea
          id={`${uid}-message`}
          rows={inspecting ? 2 : 4}
          required={!inspecting && !propertyId}
          value={formData.message}
          onChange={set('message')}
          className="form-input form-textarea"
          placeholder={propertyId ? (inspecting ? 'e.g. I’d like to see the 4-bedroom option' : `Your question about ${propertyTitle || 'this property'}`) : 'Tell us about your requirements...'}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-neutral-600 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--color-brand)]" />
        <span>Send me new listings and property updates by email. Optional; you can unsubscribe any time.</span>
      </label>

      {status === 'error' && (
        <div role="alert" className="alert alert-error">{errorText && errorText !== "Something went wrong" ? errorText : "That didn't send. Check your details and try again, or WhatsApp us."}</div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn btn-lg btn-brand w-full"
      >
        {status === 'loading' ? (
          <>
            <span className="spinner" />
            Sending...
          </>
        ) : inspecting ? 'Request inspection' : 'Send enquiry'}
      </button>
      <p className="text-xs text-neutral-400">We use your details to reply to you. See how to manage your emails in any message we send.</p>
    </form>
  )
}
