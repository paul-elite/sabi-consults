'use client'

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
        <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-ink font-medium mb-2">Thank you for your inquiry</p>
        <p className="text-sm text-neutral-600">We&apos;ll get back to you shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>
      <div>
        <label htmlFor={`${uid}-name`} className="block text-sm font-medium text-ink mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          id={`${uid}-name`}
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-white border border-neutral-300 text-[15px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-email`} className="block text-sm font-medium text-ink mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          id={`${uid}-email`}
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-white border border-neutral-300 text-[15px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-phone`} className="block text-sm font-medium text-ink mb-1.5">
          Phone Number
        </label>
        <input
          type="tel"
          id={`${uid}-phone`}
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-white border border-neutral-300 text-[15px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
          placeholder="+234 800 000 0000"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-message`} className="block text-sm font-medium text-ink mb-1.5">
          Message
        </label>
        <textarea
          id={`${uid}-message`}
          rows={4}
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-white border border-neutral-300 text-[15px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition resize-none"
          placeholder="Tell us about your requirements..."
        />
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600">{errorText && errorText !== "Something went wrong" ? errorText : "That didn’t send. Check your details and try again, or WhatsApp us."}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full h-12 rounded-lg bg-brand text-on-brand font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  )
}
