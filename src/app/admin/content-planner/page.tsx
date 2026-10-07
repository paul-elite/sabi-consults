'use client'

import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'

type Channel = 'Instagram' | 'Facebook' | 'Blog' | 'WhatsApp' | 'Email'

interface PlannerItem {
  id: string
  title: string
  channel: Channel
  date: string
  time: string
  theme: string
  note: string
  imageUrl?: string
  imageName?: string
}

const STORAGE_KEY = 'sabi-content-planner-v1'
const channels: Channel[] = ['Instagram', 'Facebook', 'Blog', 'WhatsApp', 'Email']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const channelStyles: Record<Channel, string> = {
  Instagram: 'bg-pink-50 text-pink-700',
  Facebook: 'bg-blue-50 text-blue-700',
  Blog: 'bg-amber-50 text-amber-700',
  WhatsApp: 'bg-emerald-50 text-emerald-700',
  Email: 'bg-violet-50 text-violet-700',
}

const seedItems: PlannerItem[] = [
  {
    id: 'market-update',
    title: 'Abuja land buying checklist',
    channel: 'Instagram',
    date: nextDate(1),
    time: '09:00',
    theme: 'Buyer Education',
    note: 'Carousel: title search, allocation papers, survey plan, access road, payment proof.',
    imageUrl: '',
    imageName: '',
  },
  {
    id: 'property-spotlight',
    title: 'Galadimawa plot spotlight',
    channel: 'Facebook',
    date: nextDate(3),
    time: '12:00',
    theme: 'Property Feature',
    note: 'Use verified property images, location benefits, and inspection CTA.',
    imageUrl: '',
    imageName: '',
  },
  {
    id: 'blog-investment',
    title: 'How to compare land options in Abuja',
    channel: 'Blog',
    date: nextDate(5),
    time: '15:00',
    theme: 'Investment Advisory',
    note: 'Short article for first-time investors. Include district comparison table.',
    imageUrl: '',
    imageName: '',
  },
]

function nextDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return new Date(2026, 0, 1, hour || 0, minute || 0).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function makeId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ContentPlannerPage() {
  const today = useMemo(() => new Date(), [])
  const [items, setItems] = useState<PlannerItem[]>(seedItems)
  const [calendarDate, setCalendarDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(dateKey(today))
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState<Channel>('Instagram')
  const [time, setTime] = useState('09:00')
  const [theme, setTheme] = useState('Buyer Education')
  const [note, setNote] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PlannerItem>[]
        setItems(parsed.map(item => ({
          id: item.id || makeId(),
          title: item.title || 'Untitled content',
          channel: item.channel || 'Instagram',
          date: item.date || dateKey(today),
          time: item.time || '09:00',
          theme: item.theme || 'General',
          note: item.note || '',
          imageUrl: item.imageUrl || '',
          imageName: item.imageName || '',
        })))
      }
    } catch {
      // A bad local draft should not block the planner.
    }
  }, [today])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const monthLabel = calendarDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const visibleStart = new Date(firstDay)
    visibleStart.setDate(1 - firstDay.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(visibleStart)
      day.setDate(visibleStart.getDate() + index)
      return day
    })
  }, [calendarDate])

  const selectedItems = useMemo(
    () => items.filter(item => item.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [items, selectedDate],
  )

  const itemsByDate = useMemo(() => {
    return items.reduce<Record<string, PlannerItem[]>>((groups, item) => {
      groups[item.date] = [...(groups[item.date] || []), item]
      return groups
    }, {})
  }, [items])

  const addItem = (event: React.FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    setItems(current => [
      ...current,
      {
        id: makeId(),
        title: cleanTitle,
        channel,
        date: selectedDate,
        time,
        theme: theme.trim() || 'General',
        note: note.trim(),
        imageUrl: imageUrl.trim(),
        imageName: imageName.trim(),
      },
    ])
    setTitle('')
    setNote('')
    setImageUrl('')
    setImageName('')
    setUploadError('')
  }

  const uploadImage = async (file: File | null) => {
    if (!file) return
    setUploadError('')
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'blog')

      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Image upload failed.')
      }

      setImageUrl(result.url)
      setImageName(file.name)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Image upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const removeItem = (id: string) => {
    setItems(current => current.filter(item => item.id !== id))
  }

  const shiftMonth = (amount: number) => {
    setCalendarDate(current => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const pickDay = (day: Date) => {
    setSelectedDate(dateKey(day))
    if (day.getMonth() !== calendarDate.getMonth() || day.getFullYear() !== calendarDate.getFullYear()) {
      setCalendarDate(new Date(day.getFullYear(), day.getMonth(), 1))
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand mb-3">
            <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            Content planner
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="btn btn-sm btn-outline btn-icon" aria-label="Previous month">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
          <span className="min-w-40 text-center text-sm font-medium text-ink">{monthLabel}</span>
          <button type="button" onClick={() => shiftMonth(1)} className="btn btn-sm btn-outline btn-icon" aria-label="Next month">
            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <section className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50/70">
            {weekdays.map(day => (
              <div key={day} className="px-2 sm:px-4 py-3 text-center text-[11px] sm:text-xs font-medium uppercase tracking-wider text-neutral-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map(day => {
              const key = dateKey(day)
              const dayItems = itemsByDate[key] || []
              const selected = key === selectedDate
              const muted = day.getMonth() !== calendarDate.getMonth()
              const current = sameDate(day, today)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`group min-h-24 sm:min-h-32 border-b border-r border-neutral-100 p-2 sm:p-3 text-left transition-colors last:border-r-0 ${selected ? 'bg-blue-50 ring-2 ring-inset ring-brand' : 'hover:bg-neutral-50'} ${muted ? 'bg-neutral-50/50' : 'bg-white'}`}
                >
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-medium ${current ? 'bg-brand text-on-brand' : selected ? 'text-brand' : muted ? 'text-neutral-300' : 'text-ink'}`}>
                    {day.getDate()}
                  </span>
                  <div className="mt-3 space-y-1.5">
                    {dayItems.slice(0, 2).map(item => (
                      <div key={item.id} className={`truncate rounded-md px-2 py-1 text-[11px] font-medium ${channelStyles[item.channel]}`}>
                        {formatTime(item.time)} {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && <p className="text-[11px] font-medium text-neutral-400">+{dayItems.length - 2} more</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <section className="card overflow-hidden">
            <div className="card-header">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Selected day</p>
              <h2 className="mt-1 font-medium text-ink">{formatDate(selectedDate)}</h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {selectedItems.length ? selectedItems.map(item => (
                <article key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${channelStyles[item.channel]}`}>{item.channel}</span>
                        <span className="text-sm text-neutral-400">{formatTime(item.time)}</span>
                      </div>
                      <h3 className="mt-3 font-medium text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm text-neutral-500">{item.theme}</p>
                      {item.note && <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.note}</p>}
                      {item.imageUrl && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
                          <img src={item.imageUrl} alt="" className="h-36 w-full object-cover" />
                          <div className="flex items-center justify-between gap-3 p-3">
                            <p className="min-w-0 truncate text-xs text-neutral-500">{item.imageName || 'Attached image'}</p>
                            <a href={item.imageUrl} download className="shrink-0 text-sm font-medium text-brand hover:text-brand-dark">
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => removeItem(item.id)} className="text-neutral-300 hover:text-red-500 transition-colors" aria-label={`Remove ${item.title}`}>
                      <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              )) : (
                <div className="p-6 text-sm text-neutral-400">No content planned for this day.</div>
              )}
            </div>
          </section>

          <form onSubmit={addItem} className="card card-body space-y-4">
            <div>
              <h2 className="font-medium text-ink">Add content</h2>
              <p className="text-sm text-neutral-500 mt-1">This will be added to the selected day.</p>
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
                <label htmlFor="planner-time" className="form-label">Time</label>
                <input id="planner-time" type="time" className="form-input" value={time} onChange={event => setTime(event.target.value)} />
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
            <div className="form-field">
              <label htmlFor="planner-image-link" className="form-label">Image link</label>
              <input
                id="planner-image-link"
                type="url"
                className="form-input"
                value={imageUrl}
                onChange={event => {
                  setImageUrl(event.target.value)
                  setImageName(event.target.value ? 'Linked image' : '')
                }}
                placeholder="https://..."
              />
            </div>
            <div className="form-field">
              <label htmlFor="planner-image-upload" className="form-label">Upload image</label>
              <input
                id="planner-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="form-input"
                disabled={isUploading}
                onChange={event => uploadImage(event.target.files?.[0] || null)}
              />
              {isUploading && <p className="text-xs text-neutral-500">Uploading image...</p>}
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              {imageUrl && (
                <div className="mt-2 overflow-hidden rounded-xl border border-neutral-100">
                  <img src={imageUrl} alt="" className="h-28 w-full object-cover" />
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <p className="min-w-0 truncate text-xs text-neutral-500">{imageName || 'Linked image'}</p>
                    <button type="button" onClick={() => { setImageUrl(''); setImageName('') }} className="text-xs font-medium text-red-600">
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-md btn-brand w-full">
              <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
              Add to selected day
            </button>
          </form>
        </aside>
      </div>
    </main>
  )
}
