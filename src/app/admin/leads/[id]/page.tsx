'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  CallIcon,
  Mail01Icon,
  WhatsappIcon,
  FlameIcon,
  StarIcon,
  UserIcon,
  ViewIcon,
  Home01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Location01Icon,
  Clock01Icon,
  MouseIcon,
  ImageIcon,
  MapIcon,
} from '@hugeicons/core-free-icons'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LeadWithDetails, LeadQuality, LeadStatus } from '@/lib/types'
import { RequireRole } from '@/components/admin/AdminNav'

const QUALITY_STYLES: Record<LeadQuality, { bg: string; text: string; icon: typeof StarIcon }> = {
  hot: { bg: 'bg-red-100', text: 'text-red-700', icon: FlameIcon },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700', icon: StarIcon },
  cold: { bg: 'bg-blue-100', text: 'text-blue-700', icon: UserIcon },
}

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']

const EVENT_ICONS: Record<string, typeof ViewIcon> = {
  page_view: ViewIcon,
  property_view: Home01Icon,
  gallery_view: ImageIcon,
  gallery_open: ImageIcon,
  map_interaction: MapIcon,
  whatsapp_click: WhatsappIcon,
  phone_click: CallIcon,
  email_click: Mail01Icon,
  inquiry_submitted: CheckmarkCircle01Icon,
  viewing_requested: Calendar01Icon,
  scroll_depth: MouseIcon,
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState<LeadWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function fetchLead() {
      try {
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.authenticated) {
          router.push('/admin')
          return
        }

        const res = await fetch(`/api/leads/${id}`)
        if (!res.ok) {
          router.push('/admin/leads')
          return
        }

        const data = await res.json()
        setLead(data)
        setNotes(data.notes || '')
      } catch (err) {
        console.error('Failed to fetch lead:', err)
        router.push('/admin/leads')
      } finally {
        setLoading(false)
      }
    }

    fetchLead()
  }, [id, router])

  const updateStatus = async (newStatus: LeadStatus) => {
    if (!lead) return
    setSaving(true)

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setLead({ ...lead, status: newStatus })
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    if (!lead) return
    setSaving(true)

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (res.ok) {
        setLead({ ...lead, notes })
      }
    } catch (err) {
      console.error('Failed to save notes:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading lead...</div>
      </div>
    )
  }

  if (!lead) return null

  const qualityStyle = QUALITY_STYLES[lead.quality]

  // Group events by date
  const eventsByDate = (lead.events || []).reduce((acc, event) => {
    const dateKey = new Date(event.occurredAt).toDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(event)
    return acc
  }, {} as Record<string, typeof lead.events>)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/leads" className="text-neutral-500 hover:text-ink transition-colors">
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" strokeWidth={1.7} />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-ink">{lead.name}</h1>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${qualityStyle.bg} ${qualityStyle.text}`}>
                    <HugeiconsIcon icon={qualityStyle.icon} className="w-3.5 h-3.5" strokeWidth={1.7} />
                    {lead.quality.toUpperCase()} ({lead.score})
                  </div>
                </div>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Lead since {formatDate(lead.createdAt)}
                </p>
              </div>
            </div>

            {/* Status selector */}
            <select
              value={lead.status}
              onChange={(e) => updateStatus(e.target.value as LeadStatus)}
              disabled={saving}
              className="form-input form-select w-auto"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Contact & Details */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="card p-5">
              <h2 className="font-medium text-ink mb-4">Contact</h2>
              <div className="space-y-3">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-3 text-sm hover:text-brand transition-colors">
                    <HugeiconsIcon icon={CallIcon} className="w-4 h-4 text-neutral-400" strokeWidth={1.7} />
                    <span>{lead.phone}</span>
                  </a>
                )}
                {lead.whatsapp && (
                  <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-brand transition-colors">
                    <HugeiconsIcon icon={WhatsappIcon} className="w-4 h-4 text-neutral-400" strokeWidth={1.7} />
                    <span>{lead.whatsapp}</span>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-sm hover:text-brand transition-colors">
                    <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-neutral-400" strokeWidth={1.7} />
                    <span>{lead.email}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Acquisition */}
            <div className="card p-5">
              <h2 className="font-medium text-ink mb-4">Acquisition</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Source</dt>
                  <dd className="text-ink capitalize">{lead.source || 'Direct'}</dd>
                </div>
                {lead.utmCampaign && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Campaign</dt>
                    <dd className="text-ink">{lead.utmCampaign}</dd>
                  </div>
                )}
                {lead.landingPage && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Landing page</dt>
                    <dd className="text-ink truncate max-w-[150px]">{lead.landingPage}</dd>
                  </div>
                )}
                {lead.deviceType && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Device</dt>
                    <dd className="text-ink capitalize">{lead.deviceType}</dd>
                  </div>
                )}
                {lead.country && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Location</dt>
                    <dd className="text-ink">{[lead.city, lead.country].filter(Boolean).join(', ')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Engagement */}
            <div className="card p-5">
              <h2 className="font-medium text-ink mb-4">Engagement</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Visits</dt>
                  <dd className="text-ink">{lead.totalVisits || 1}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Properties viewed</dt>
                  <dd className="text-ink">{lead.totalPropertyViews || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Contact clicks</dt>
                  <dd className="text-ink">{lead.totalContactClicks || 0}</dd>
                </div>
                {lead.firstVisitAt && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">First visit</dt>
                    <dd className="text-ink">{formatDate(lead.firstVisitAt)}</dd>
                  </div>
                )}
                {lead.lastActivityAt && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Last active</dt>
                    <dd className="text-ink">{formatDate(lead.lastActivityAt)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Score Breakdown */}
            {lead.scoreBreakdown && Object.keys(lead.scoreBreakdown).length > 0 && (
              <div className="card p-5">
                <h2 className="font-medium text-ink mb-4">Score Breakdown</h2>
                <div className="space-y-2">
                  {Object.entries(lead.scoreBreakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-neutral-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-brand">+{value as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="card p-5">
              <h2 className="font-medium text-ink mb-4">Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="form-input form-textarea w-full text-sm"
                placeholder="Add notes about this lead..."
              />
              <button
                onClick={saveNotes}
                disabled={saving || notes === (lead.notes || '')}
                className="btn btn-sm btn-primary mt-3"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Middle Column - Properties & Viewing Requests */}
          <div className="space-y-6">
            {/* Interested Properties */}
            <div className="card p-5">
              <h2 className="font-medium text-ink mb-4">Interested Properties</h2>
              {lead.propertyInterests && lead.propertyInterests.length > 0 ? (
                <div className="space-y-3">
                  {lead.propertyInterests.map((interest) => (
                    <div key={interest.id} className="flex gap-3 p-3 rounded-lg bg-neutral-50">
                      {interest.property?.images?.[0] && (
                        <img
                          src={interest.property.images[0]}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/properties/${interest.propertyId}`}
                          className="font-medium text-ink hover:text-brand truncate block"
                        >
                          {interest.property?.title || 'Property'}
                        </Link>
                        <p className="text-sm text-neutral-500">{interest.property?.district}</p>
                        <div className="flex gap-3 mt-1 text-xs text-neutral-400">
                          <span>{interest.viewCount} views</span>
                          {interest.galleryViews > 0 && <span>{interest.galleryViews} gallery</span>}
                          {interest.interestType === 'viewing_requested' && (
                            <span className="text-brand font-medium">Viewing requested</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No property interests recorded</p>
              )}
            </div>

            {/* Viewing Requests */}
            {lead.viewingRequests && lead.viewingRequests.length > 0 && (
              <div className="card p-5">
                <h2 className="font-medium text-ink mb-4">Viewing Requests</h2>
                <div className="space-y-3">
                  {lead.viewingRequests.map((request) => (
                    <div key={request.id} className="p-3 rounded-lg border border-neutral-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-ink">{request.property?.title}</p>
                          <p className="text-sm text-neutral-500">{request.property?.district}</p>
                        </div>
                        <span className={`badge ${
                          request.status === 'confirmed' ? 'badge-success' :
                          request.status === 'pending' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      {(request.preferredDate || request.preferredTime) && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600">
                          <HugeiconsIcon icon={Calendar01Icon} className="w-4 h-4 text-neutral-400" strokeWidth={1.7} />
                          {request.preferredDate && new Date(request.preferredDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {request.preferredTime && ` · ${request.preferredTime}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            {lead.preferences && (
              <div className="card p-5">
                <h2 className="font-medium text-ink mb-4">Preferences</h2>
                <dl className="space-y-3 text-sm">
                  {lead.preferences.intent && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Looking to</dt>
                      <dd className="text-ink capitalize">{lead.preferences.intent}</dd>
                    </div>
                  )}
                  {lead.preferences.propertyTypes?.length > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Property type</dt>
                      <dd className="text-ink capitalize">{lead.preferences.propertyTypes.join(', ')}</dd>
                    </div>
                  )}
                  {lead.preferences.preferredDistricts?.length > 0 && (
                    <div>
                      <dt className="text-neutral-500 mb-1">Preferred locations</dt>
                      <dd className="flex flex-wrap gap-1">
                        {lead.preferences.preferredDistricts.map(d => (
                          <span key={d} className="px-2 py-0.5 bg-neutral-100 rounded text-xs">{d}</span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {(lead.preferences.minBudget || lead.preferences.maxBudget) && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Budget</dt>
                      <dd className="text-ink">
                        {lead.preferences.minBudget && `₦${(lead.preferences.minBudget / 1000000).toFixed(0)}M`}
                        {lead.preferences.minBudget && lead.preferences.maxBudget && ' - '}
                        {lead.preferences.maxBudget && `₦${(lead.preferences.maxBudget / 1000000).toFixed(0)}M`}
                      </dd>
                    </div>
                  )}
                  {lead.preferences.timeline && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Timeline</dt>
                      <dd className="text-ink">{lead.preferences.timeline}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Right Column - Timeline */}
          <div className="card p-5">
            <h2 className="font-medium text-ink mb-4">Activity Timeline</h2>
            {lead.events && lead.events.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(eventsByDate).map(([dateKey, events]) => (
                  <div key={dateKey}>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
                      {formatDate(events[0].occurredAt)}
                    </p>
                    <div className="space-y-3">
                      {events.map((event) => {
                        const Icon = EVENT_ICONS[event.eventType] || ViewIcon
                        return (
                          <div key={event.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                              <HugeiconsIcon icon={Icon} className="w-4 h-4 text-neutral-500" strokeWidth={1.7} />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <p className="text-sm text-ink">
                                {event.eventType === 'page_view' && `Viewed ${event.pagePath}`}
                                {event.eventType === 'property_view' && `Viewed ${event.propertyTitle || 'a property'}`}
                                {event.eventType === 'gallery_view' && `Browsed gallery`}
                                {event.eventType === 'gallery_open' && `Opened gallery for ${event.propertyTitle}`}
                                {event.eventType === 'map_interaction' && `Interacted with map`}
                                {event.eventType === 'whatsapp_click' && `Clicked WhatsApp`}
                                {event.eventType === 'phone_click' && `Clicked phone number`}
                                {event.eventType === 'email_click' && `Clicked email`}
                                {event.eventType === 'inquiry_submitted' && `Submitted inquiry`}
                                {event.eventType === 'viewing_requested' && `Requested viewing`}
                                {event.eventType === 'scroll_depth' && `Scrolled ${event.metadata?.scroll_percent || 0}%`}
                                {!['page_view', 'property_view', 'gallery_view', 'gallery_open', 'map_interaction', 'whatsapp_click', 'phone_click', 'email_click', 'inquiry_submitted', 'viewing_requested', 'scroll_depth'].includes(event.eventType) && event.eventType.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {formatTime(event.occurredAt)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <HugeiconsIcon icon={Clock01Icon} className="w-10 h-10 text-neutral-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-neutral-400">No activity recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function LeadDetailAdminPage({ params }: { params: Promise<{ id: string }> }) {
  return <RequireRole min="admin"><LeadDetailPage params={params} /></RequireRole>
}
