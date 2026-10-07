'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  AiIdeaIcon,
  Calendar03Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  News01Icon,
} from '@hugeicons/core-free-icons'

import { useEffect, useMemo, useState } from 'react'

type Channel = 'Instagram' | 'Facebook' | 'Blog' | 'WhatsApp' | 'Email'
type Status = 'Idea' | 'Drafting' | 'Review' | 'Scheduled'

interface PlannerItem {
  id: string
  title: string
  channel: Channel
  date: string
  status: Status
  theme: string
  note: string
}

const STORAGE_KEY = 'sabi-content-planner-v1'
const statuses: Status[] = ['Idea', 'Drafting', 'Review', 'Scheduled']
const channels: Channel[] = ['Instagram', 'Facebook', 'Blog', 'WhatsApp', 'Email']

const seedItems: PlannerItem[] = [
  {
    id: 'market-update',
    title: 'Abuja land buying checklist',
    channel: 'Instagram',
    date: nextDate(1),
    status: 'Drafting',
    theme: 'Buyer Education',
    note: 'Carousel: title search, allocation papers, survey plan, access road, payment proof.',
  },
  {
    id: 'property-spotlight',
    title: 'Galadimawa plot spotlight',
    channel: 'Facebook',
    date: nextDate(3),
    status: 'Review',
    theme: 'Property Feature',
    note: 'Use verified property images, location benefits, and inspection CTA.',
  },
  {
    id: 'blog-investment',
    title: 'How to compare land options in Abuja',
    channel: 'Blog',
    date: nextDate(5),
    status: 'Idea',
    theme: 'Investment Advisory',
    note: 'Short article for first-time investors. Include district comparison table.',
  },
  {
    id: 'whatsapp-broadcast',
    title: 'Weekend inspection slots',
    channel: 'WhatsApp',
    date: nextDate(6),
    status: 'Scheduled',
    theme: 'Lead Nurture',
    note: 'Broadcast to warm leads with two available inspection windows.',
  },
]

const channelStyles: Record<Channel, string> = {
  Instagram: 'bg-pink-50 text-pink-700',
  Facebook: 'bg-blue-50 text-blue-700',
  Blog: 'bg-amber-50 text-amber-700',
  WhatsApp: 'bg-emerald-50 text-emerald-700',
  Email: 'bg-violet-50 text-violet-700',
}

function nextDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatDate(value: string) {
  if (!value) return 'No date'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function makeId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ContentPlannerPage() {
  const [items, setItems] = useState<PlannerItem[]>(seedItems)
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState<Channel>('Instagram')
  const [date, setDate] = useState(nextDate(2))
  const [theme, setTheme] = useState('Buyer Education')
  const [note, setNote] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch {
      // A bad local draft should not block the planner.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const upcoming = useMemo(
    () => [...items].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    [items],
  )
  const scheduled = items.filter(item => item.status === 'Scheduled').length
  const thisWeek = items.filter(item => {
    const diff = (new Date(`${item.date}T12:00:00`).getTime() - Date.now()) / 86400000
    return diff >= -1 && diff <= 7
  }).length

  const addItem = (event: React.FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    setItems(current => [
      {
        id: makeId(),
        title: cleanTitle,
        channel,
        date,
        status: 'Idea',
        theme: theme.trim() || 'General',
        note: note.trim(),
      },
      ...current,
    ])
    setTitle('')
    setNote('')
  }

  const updateStatus = (id: string, status: Status) => {
    setItems(current => current.map(item => item.id === id ? { ...item, status } : item))
  }

  const removeItem = (id: string) => {
    setItems(current => current.filter(item => item.id !== id))
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand mb-3">
            <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            Content planner
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Plan Sabi Consults content</h1>
          <p className="text-neutral-500 mt-2 max-w-2xl">
            Map property features, buyer education, market updates, and lead nurturing content before they move into blog or social publishing.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 max-w-xl">
          Backend-ready provision: this planner currently saves drafts on this device. It is structured to connect to a shared database when you want staff-wide live planning.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card card-body">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Planned pieces</p>
          <p className="text-3xl font-semibold text-ink mt-1">{items.length}</p>
        </div>
        <div className="card card-body">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">This week</p>
          <p className="text-3xl font-semibold text-brand mt-1">{thisWeek}</p>
        </div>
        <div className="card card-body">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Scheduled</p>
          <p className="text-3xl font-semibold text-emerald-600 mt-1">{scheduled}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        <aside className="space-y-6">
          <form onSubmit={addItem} className="card card-body space-y-4">
            <div>
              <h2 className="font-medium text-ink">Add content idea</h2>
              <p className="text-sm text-neutral-500 mt-1">Create a quick planning card for the team.</p>
            </div>
            <div className="form-field">
              <label htmlFor="planner-title" className="form-label">Title</label>
              <input
                id="planner-title"
                className="form-input"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="e.g. Maitama property spotlight"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-field">
                <label htmlFor="planner-channel" className="form-label">Channel</label>
                <select id="planner-channel" className="form-input form-select" value={channel} onChange={event => setChannel(event.target.value as Channel)}>
                  {channels.map(item => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="planner-date" className="form-label">Date</label>
                <input id="planner-date" type="date" className="form-input" value={date} onChange={event => setDate(event.target.value)} />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="planner-theme" className="form-label">Theme</label>
              <input id="planner-theme" className="form-input" value={theme} onChange={event => setTheme(event.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="planner-note" className="form-label">Notes</label>
              <textarea
                id="planner-note"
                className="form-input form-textarea"
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder="Angle, CTA, assets needed, or caption notes"
              />
            </div>
            <button type="submit" className="btn btn-md btn-brand w-full">
              <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
              Add to planner
            </button>
          </form>

          <section className="card overflow-hidden">
            <div className="card-header">
              <h2 className="font-medium text-ink">Upcoming calendar</h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {upcoming.map(item => (
                <div key={item.id} className="p-4 flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 grid place-items-center text-xs font-semibold text-neutral-600 shrink-0">
                    {new Date(`${item.date}T12:00:00`).getDate()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{item.title}</p>
                    <p className="text-sm text-neutral-500">{formatDate(item.date)} · {item.channel}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {statuses.map(status => {
              const columnItems = items.filter(item => item.status === status)
              return (
                <div key={status} className="card min-h-[420px] overflow-hidden">
                  <div className="card-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={status} />
                      <h2 className="font-medium text-ink">{status}</h2>
                    </div>
                    <span className="badge badge-neutral">{columnItems.length}</span>
                  </div>
                  <div className="p-3 space-y-3">
                    {columnItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-neutral-200 p-5 text-sm text-neutral-400 text-center">
                        No content here yet
                      </div>
                    ) : columnItems.map(item => (
                      <article key={item.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className={`badge ${channelStyles[item.channel]}`}>{item.channel}</span>
                            <h3 className="mt-3 font-medium text-ink leading-snug">{item.title}</h3>
                          </div>
                          <button type="button" onClick={() => removeItem(item.id)} className="text-neutral-300 hover:text-red-500 transition-colors" aria-label={`Remove ${item.title}`}>
                            <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-neutral-500">{formatDate(item.date)} · {item.theme}</p>
                        {item.note && <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{item.note}</p>}
                        <div className="mt-4">
                          <label className="sr-only" htmlFor={`status-${item.id}`}>Move card</label>
                          <select
                            id={`status-${item.id}`}
                            className="form-input form-select h-9 text-sm"
                            value={item.status}
                            onChange={event => updateStatus(item.id, event.target.value as Status)}
                          >
                            {statuses.map(option => <option key={option}>{option}</option>)}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function StatusIcon({ status }: { status: Status }) {
  const icon = status === 'Scheduled'
    ? CheckmarkCircle01Icon
    : status === 'Review'
      ? News01Icon
      : status === 'Drafting'
        ? Calendar03Icon
        : AiIdeaIcon

  return (
    <span className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 grid place-items-center">
      <HugeiconsIcon icon={icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
    </span>
  )
}
