'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Tick02Icon } from '@hugeicons/core-free-icons'

import { useId, useState } from 'react'

interface ContactFormProps {
  propertyId?: string
  propertyTitle?: string
}

export default function ContactForm({ propertyId, propertyTitle }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: propertyTitle ? `I'm interested in: ${propertyTitle}` : '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorText, setErrorText] = useState('')
  const uid = useId()
  const [website, setWebsite] = useState('') // spam trap, hidden from people

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          propertyId,
          website,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      setStatus('success')
      setFormData({ name: '', email: '', phone: '', message: '' })
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : '')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <HugeiconsIcon icon={Tick02Icon} className="w-12 h-12 text-green-500 mx-auto mb-4" strokeWidth={1.7} aria-hidden="true" />
        <p className="text-ink font-medium mb-2">Thank you for your inquiry</p>
        <p className="text-sm text-neutral-600">We&apos;ll get back to you shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>
      <div className="form-field">
        <label htmlFor={`${uid}-name`} className="form-label">
          Full Name
        </label>
        <input
          type="text"
          id={`${uid}-name`}
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="form-input"
          placeholder="Your full name"
        />
      </div>

      <div className="form-field">
        <label htmlFor={`${uid}-email`} className="form-label">
          Email Address
        </label>
        <input
          type="email"
          id={`${uid}-email`}
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="form-input"
          placeholder="you@example.com"
        />
      </div>

      <div className="form-field">
        <label htmlFor={`${uid}-phone`} className="form-label">
          Phone Number
        </label>
        <input
          type="tel"
          id={`${uid}-phone`}
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="form-input"
          placeholder="+234 800 000 0000"
        />
      </div>

      <div className="form-field">
        <label htmlFor={`${uid}-message`} className="form-label">
          Message
        </label>
        <textarea
          id={`${uid}-message`}
          rows={4}
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="form-input form-textarea"
          placeholder="Tell us about your requirements..."
        />
      </div>

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
        ) : 'Send enquiry'}
      </button>
    </form>
  )
}
