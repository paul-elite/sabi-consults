'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Tick02Icon, Home01Icon, Calendar01Icon, Search01Icon, CallIcon } from '@hugeicons/core-free-icons'

import { useState, useId, useEffect, useCallback } from 'react'
import { Property, PopupType, LeadIntent } from '@/lib/types'
import { getVisitorIdentity, trackPopupView, trackPopupDismissed, trackPopupStarted, trackPopupSubmitted } from '@/lib/analytics'

// ============================================================================
// Types
// ============================================================================

interface LeadCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  variant: PopupType
  property?: Property
  onSuccess?: () => void
}

interface FormData {
  name: string
  phone: string
  email: string
  intent: LeadIntent | ''
  preferredDistricts: string[]
  propertyTypes: string[]
  minBudget: string
  maxBudget: string
  timeline: string
  preferredDate: string
  preferredTime: string
  message: string
}

// ============================================================================
// Variant Configuration
// ============================================================================

const VARIANTS: Record<PopupType, {
  title: string
  description: string
  fields: (keyof FormData)[]
  buttonText: string
  icon: typeof Home01Icon
}> = {
  property_interest: {
    title: 'Interested in this property?',
    description: 'Leave your details and an agent will help you with availability, pricing, and next steps.',
    fields: ['name', 'phone'],
    buttonText: "I'm interested",
    icon: Home01Icon,
  },
  request_details: {
    title: 'Want the full property details?',
    description: 'We can send the price, availability and additional information directly to you.',
    fields: ['name', 'phone', 'email'],
    buttonText: 'Send me the details',
    icon: Home01Icon,
  },
  schedule_viewing: {
    title: 'See this property in person',
    description: "Choose how you'd like us to reach you and we'll help arrange a viewing.",
    fields: ['name', 'phone', 'preferredDate', 'preferredTime'],
    buttonText: 'Request a viewing',
    icon: Calendar01Icon,
  },
  property_match: {
    title: "Can't find exactly what you're looking for?",
    description: "Tell us what you need and we'll let you know when we have something that matches.",
    fields: ['name', 'phone', 'intent', 'preferredDistricts', 'propertyTypes', 'maxBudget'],
    buttonText: 'Find properties for me',
    icon: Search01Icon,
  },
  exit_intent: {
    title: 'Before you go...',
    description: "Leave your number and we'll send you similar properties when they become available.",
    fields: ['name', 'phone'],
    buttonText: 'Keep me updated',
    icon: CallIcon,
  },
}

const DISTRICTS = [
  'Maitama', 'Asokoro', 'Wuse II', 'Jabi', 'Gwarinpa', 'Katampe',
  'Life Camp', 'Utako', 'Garki', 'Central Area', 'Apo', 'Lugbe',
]

const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' },
]

const TIMELINES = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1-3 months', label: '1-3 months' },
  { value: '3-6 months', label: '3-6 months' },
  { value: '6+ months', label: '6+ months' },
]

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (9am-12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm-4pm)' },
  { value: 'evening', label: 'Evening (4pm-7pm)' },
]

// ============================================================================
// Component
// ============================================================================

export default function LeadCaptureModal({
  isOpen,
  onClose,
  variant,
  property,
  onSuccess,
}: LeadCaptureModalProps) {
  const uid = useId()
  const config = VARIANTS[variant]

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    intent: '',
    preferredDistricts: [],
    propertyTypes: [],
    minBudget: '',
    maxBudget: '',
    timeline: '',
    preferredDate: '',
    preferredTime: '',
    message: '',
  })

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorText, setErrorText] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [website, setWebsite] = useState('') // Honeypot

  // Track popup view
  useEffect(() => {
    if (isOpen) {
      trackPopupView(variant, property ? {
        id: property.id,
        title: property.title,
        district: property.district,
        type: property.type,
        price: property.price,
      } : undefined)
    }
  }, [isOpen, variant, property])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleClose = useCallback(() => {
    if (status !== 'success') {
      trackPopupDismissed(variant, property ? {
        id: property.id,
        title: property.title,
        district: property.district,
        type: property.type,
        price: property.price,
      } : undefined)
    }
    onClose()
  }, [status, variant, property, onClose])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (config.fields.includes('name') && !formData.name.trim()) {
      newErrors.name = 'Please enter your name'
    }

    if (config.fields.includes('phone')) {
      const digits = formData.phone.replace(/\D/g, '')
      if (!digits || digits.length < 7) {
        newErrors.phone = 'Please enter a valid phone number'
      }
    }

    if (config.fields.includes('email') && formData.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    trackPopupStarted(variant, property ? {
      id: property.id,
      title: property.title,
    } : undefined)

    setStatus('loading')
    setErrorText('')

    try {
      const identity = getVisitorIdentity()

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        intent: formData.intent || undefined,
        preferredDistricts: formData.preferredDistricts.length > 0 ? formData.preferredDistricts : undefined,
        propertyTypes: formData.propertyTypes.length > 0 ? formData.propertyTypes : undefined,
        minBudget: formData.minBudget ? parseInt(formData.minBudget, 10) : undefined,
        maxBudget: formData.maxBudget ? parseInt(formData.maxBudget, 10) : undefined,
        timeline: formData.timeline || undefined,
        preferredDate: formData.preferredDate || undefined,
        preferredTime: formData.preferredTime || undefined,
        propertyId: property?.id,
        ...identity,
        website, // Honeypot
      }

      // If this is a viewing request, use a different endpoint
      const endpoint = variant === 'schedule_viewing' ? '/api/viewing-requests' : '/api/leads'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      trackPopupSubmitted(variant, property ? {
        id: property.id,
        title: property.title,
      } : undefined)

      setStatus('success')
      onSuccess?.()

    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const toggleArrayField = (field: 'preferredDistricts' | 'propertyTypes', value: string) => {
    setFormData(prev => {
      const arr = prev[field]
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) }
      }
      return { ...prev, [field]: [...arr, value] }
    })
  }

  if (!isOpen) return null

  // Success state
  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={Tick02Icon} className="w-8 h-8 text-emerald-600" strokeWidth={1.7} />
          </div>
          <h3 className="text-xl font-semibold text-ink mb-2">Thank you!</h3>
          <p className="text-neutral-600 mb-6">
            {variant === 'schedule_viewing'
              ? "We've received your viewing request. Our team will contact you shortly to confirm."
              : "We've got your details. Our team will be in touch soon."}
          </p>
          <button onClick={handleClose} className="btn btn-lg btn-brand">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 transition-colors z-10"
          aria-label="Close"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-neutral-400" strokeWidth={1.7} />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-brand-soft flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={config.icon} className="w-6 h-6 text-brand" strokeWidth={1.7} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">{config.title}</h3>
              <p className="text-sm text-neutral-600 mt-1">{config.description}</p>
            </div>
          </div>

          {/* Property preview if applicable */}
          {property && (variant === 'property_interest' || variant === 'request_details' || variant === 'schedule_viewing') && (
            <div className="mb-6 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex gap-3">
                {property.images?.[0] && (
                  <img
                    src={property.images[0]}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{property.title}</p>
                  <p className="text-sm text-neutral-500">{property.district}</p>
                  <p className="text-sm font-medium text-brand mt-1">
                    ₦{(property.price / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot */}
            <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
              <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
            </div>

            {/* Name */}
            {config.fields.includes('name') && (
              <div className="form-field">
                <label htmlFor={`${uid}-name`} className="form-label">Full name</label>
                <input
                  type="text"
                  id={`${uid}-name`}
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                  className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  placeholder="Your full name"
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>
            )}

            {/* Phone */}
            {config.fields.includes('phone') && (
              <div className="form-field">
                <label htmlFor={`${uid}-phone`} className="form-label">Phone / WhatsApp</label>
                <input
                  type="tel"
                  id={`${uid}-phone`}
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                  placeholder="+234 800 000 0000"
                />
                {errors.phone && <p className="form-error">{errors.phone}</p>}
              </div>
            )}

            {/* Email */}
            {config.fields.includes('email') && (
              <div className="form-field">
                <label htmlFor={`${uid}-email`} className="form-label">
                  Email <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  type="email"
                  id={`${uid}-email`}
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>
            )}

            {/* Intent (Buy/Rent) */}
            {config.fields.includes('intent') && (
              <div className="form-field">
                <label className="form-label">Looking to</label>
                <div className="flex gap-3">
                  {[
                    { value: 'buy', label: 'Buy' },
                    { value: 'rent', label: 'Rent' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('intent', option.value as LeadIntent)}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-colors ${
                        formData.intent === option.value
                          ? 'border-brand bg-brand-soft text-brand'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Districts */}
            {config.fields.includes('preferredDistricts') && (
              <div className="form-field">
                <label className="form-label">Preferred locations</label>
                <div className="flex flex-wrap gap-2">
                  {DISTRICTS.slice(0, 8).map(district => (
                    <button
                      key={district}
                      type="button"
                      onClick={() => toggleArrayField('preferredDistricts', district)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        formData.preferredDistricts.includes(district)
                          ? 'bg-brand text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {district}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Property Types */}
            {config.fields.includes('propertyTypes') && (
              <div className="form-field">
                <label className="form-label">Property type</label>
                <div className="flex gap-3">
                  {PROPERTY_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => toggleArrayField('propertyTypes', type.value)}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-colors ${
                        formData.propertyTypes.includes(type.value)
                          ? 'border-brand bg-brand-soft text-brand'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Max Budget */}
            {config.fields.includes('maxBudget') && (
              <div className="form-field">
                <label htmlFor={`${uid}-budget`} className="form-label">Budget (₦)</label>
                <select
                  id={`${uid}-budget`}
                  value={formData.maxBudget}
                  onChange={e => updateField('maxBudget', e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">Select budget range</option>
                  <option value="50000000">Up to ₦50M</option>
                  <option value="100000000">Up to ₦100M</option>
                  <option value="200000000">Up to ₦200M</option>
                  <option value="500000000">Up to ₦500M</option>
                  <option value="1000000000">₦500M+</option>
                </select>
              </div>
            )}

            {/* Preferred Date */}
            {config.fields.includes('preferredDate') && (
              <div className="form-field">
                <label htmlFor={`${uid}-date`} className="form-label">
                  Preferred date <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  type="date"
                  id={`${uid}-date`}
                  value={formData.preferredDate}
                  onChange={e => updateField('preferredDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="form-input"
                />
              </div>
            )}

            {/* Preferred Time */}
            {config.fields.includes('preferredTime') && (
              <div className="form-field">
                <label htmlFor={`${uid}-time`} className="form-label">
                  Preferred time <span className="text-neutral-400">(optional)</span>
                </label>
                <select
                  id={`${uid}-time`}
                  value={formData.preferredTime}
                  onChange={e => updateField('preferredTime', e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">Any time</option>
                  {TIME_SLOTS.map(slot => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Error message */}
            {status === 'error' && (
              <div role="alert" className="alert alert-error">
                {errorText || "That didn't work. Please try again or contact us directly."}
              </div>
            )}

            {/* Submit */}
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
              ) : config.buttonText}
            </button>

            {/* Privacy note */}
            <p className="text-xs text-neutral-400 text-center">
              Your information will only be used to contact you about this inquiry.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
