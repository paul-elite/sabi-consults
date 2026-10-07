'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  AiIdeaIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  News01Icon,
} from '@hugeicons/core-free-icons'

import { useEffect, useMemo, useState } from 'react'

type Channel = 'Instagram' | 'Facebook' | 'Blog' | 'WhatsApp' | 'Email'
type Status = 'Idea' | 'Drafting' | 'Review' | 'Scheduled'
type CalendarView = 'month' | 'week' | 'day' | 'hour'

interface PlannerItem {
  id: string
  title: string
  channel: Channel
  date: string
  time: string
  status: Status
  theme: string
  note: string
}

const STORAGE_KEY = 'sabi-content-planner-v1'
const statuses: Status[] = ['Idea', 'Drafting', 'Review', 'Scheduled']
const channels: Channel[] = ['Instagram', 'Facebook', 'Blog', 'WhatsApp', 'Email']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const views: { id: CalendarView; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'hour', label: 'Hour' },
]
const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)

const seedItems: PlannerItem[] = [
  {
    id: 'market-update',
    title: 'Abuja land buying checklist',
    channel: 'Instagram',
    date: nextDate(1),
    time: '09:00',
    status: 'Drafting',
    theme: 'Buyer Education',
    note: 'Carousel: title search, allocation papers, survey plan, access road, payment proof.',
  },
  {
    id: 'property-spotlight',
    title: 'Galadimawa plot spotlight',
    channel: 'Facebook',
    date: nextDate(3),
    time: '12:00',
    status: 'Review',
    theme: 'Property Feature',
    note: 'Use verified property images, location benefits, and inspection CTA.',
  },
  {
    id: 'blog-investment',
    title: 'How to compare land options in Abuja',
    channel: 'Blog',
    date: nextDate(5),
    time: '15:00',
    status: 'Idea',
    theme: 'Investment Advisory',
    note: 'Short article for first-time investors. Include district comparison table.',
  },
  {
    id: 'whatsapp-broadcast',
    title: 'Weekend inspection slots',
    channel: 'WhatsApp',
    date: nextDate(6),
    time: '10:00',
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

function formatTime(value: string) {
  if (!value) return '9:00 AM'
  const [hour, minute] = value.split(':').map(Number)
  return new Date(2026, 0, 1, hour || 0, minute || 0).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfWeek(date: Date) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  start.setHours(12, 0, 0, 0)
  return start
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function makeId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ContentPlannerPage() {
  const [items, setItems] = useState<PlannerItem[]>(seedItems)
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState<Channel>('Instagram')
  const [date, setDate] = useState(nextDate(2))
  const [time, setTime] = useState('09:00')
  const [theme, setTheme] = useState('Buyer Education')
  const [note, setNote] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setItems((JSON.parse(saved) as PlannerItem[]).map(item => ({ ...item, time: item.time || '09:00' })))
      }
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
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const first = new Date(year, month, 1)
    const total = new Date(year, month + 1, 0).getDate()
    return [
      ...Array.from({ length: first.getDay() }, () => null),
      ...Array.from({ length: total }, (_, index) => new Date(year, month, index + 1)),
    ]
  }, [calendarDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(calendarDate), index)), [calendarDate])
  const monthLabel = calendarDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
  const weekLabel = `${formatDate(dateKey(weekDays[0]))} - ${formatDate(dateKey(weekDays[6]))}`
  const dayLabel = formatDate(dateKey(calendarDate))
  const visibleMonthItems = items.filter(item => item.date.startsWith(monthKey(calendarDate)))
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
        time,
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

  const shiftMonth = (amount: number) => {
    setCalendarDate(current => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const shiftRange = (amount: number) => {
    if (calendarView === 'month') {
      shiftMonth(amount)
      return
    }
    setCalendarDate(current => addDays(current, amount * (calendarView === 'week' ? 7 : 1)))
  }

  const itemsForDate = (day: Date) =>
    items
      .filter(item => item.date === dateKey(day))
      .sort((a, b) => a.time.localeCompare(b.time))

  const hourItems = (hour: string) => itemsForDate(calendarDate).filter(item => item.time.slice(0, 2) === hour.slice(0, 2))

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <section className="min-w-0 space-y-6">
          <div className="card overflow-hidden">
            <div className="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-medium text-ink">Publishing calendar</h2>
                <p className="text-sm text-neutral-500 mt-1">{visibleMonthItems.length} planned pieces in {monthLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => shiftRange(-1)} className="btn btn-sm btn-outline btn-icon" aria-label="Previous period">
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                </button>
                <span className="min-w-40 text-center text-sm font-medium text-ink">
                  {calendarView === 'month' ? monthLabel : calendarView === 'week' ? weekLabel : dayLabel}
                </span>
                <button type="button" onClick={() => shiftRange(1)} className="btn btn-sm btn-outline btn-icon" aria-label="Next period">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                </button>
              </div>
              <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
                {views.map(view => (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setCalendarView(view.id)}
                    className={`h-8 rounded-md px-3 text-sm transition-colors ${calendarView === view.id ? 'bg-white text-[#0055cc] shadow-sm font-medium' : 'text-neutral-500 hover:text-ink'}`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            {calendarView === 'month' && <MonthView calendarDays={calendarDays} items={items} onSelectDay={day => { setCalendarDate(day); setCalendarView('day') }} />}
            {calendarView === 'week' && <WeekView days={weekDays} getItems={itemsForDate} onSelectDay={day => { setCalendarDate(day); setCalendarView('day') }} />}
            {calendarView === 'day' && <DayView day={calendarDate} items={itemsForDate(calendarDate)} />}
            {calendarView === 'hour' && <HourView hours={hours} getItems={hourItems} />}
          </div>

          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="font-medium text-ink">Production pipeline</h2>
              <p className="text-sm text-neutral-500 mt-1">Move each item through the content workflow.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border-t border-neutral-100">
              {statuses.map(status => {
                const columnItems = items.filter(item => item.status === status)
                return (
                  <div key={status} className="min-h-80 border-b lg:border-b-0 lg:border-r border-neutral-100 last:border-r-0">
                    <div className="px-4 py-3 flex items-center justify-between bg-neutral-50/70">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={status} />
                        <h3 className="font-medium text-ink">{status}</h3>
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
                              <h4 className="mt-3 font-medium text-ink leading-snug">{item.title}</h4>
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
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
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
              <label htmlFor="planner-time" className="form-label">Time</label>
              <input id="planner-time" type="time" className="form-input" value={time} onChange={event => setTime(event.target.value)} />
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
      </div>
    </main>
  )
}

function MonthView({ calendarDays, items, onSelectDay }: { calendarDays: (Date | null)[]; items: PlannerItem[]; onSelectDay: (day: Date) => void }) {
  return (
    <>
      <div className="hidden md:grid grid-cols-7 border-t border-neutral-100 bg-neutral-50/70">
        {weekdays.map(day => (
          <div key={day} className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-neutral-400 border-r border-neutral-100 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="hidden md:grid grid-cols-7 border-t border-neutral-100">
        {calendarDays.map((day, index) => {
          const dayItems = day ? items.filter(item => item.date === dateKey(day)).sort((a, b) => a.time.localeCompare(b.time)) : []
          const isToday = day ? sameDate(day, new Date()) : false
          return (
            <div key={day?.toISOString() ?? `blank-${index}`} className="min-h-36 border-r border-b border-neutral-100 p-2 last:border-r-0">
              {day && (
                <>
                  <button type="button" onClick={() => onSelectDay(day)} className="flex w-full items-center justify-between gap-2 mb-2 rounded-lg hover:bg-neutral-50">
                    <span className={`w-7 h-7 rounded-full grid place-items-center text-sm font-medium ${isToday ? 'bg-brand text-on-brand' : 'text-neutral-500'}`}>
                      {day.getDate()}
                    </span>
                    {dayItems.length > 0 && <span className="text-[11px] text-neutral-400">{dayItems.length}</span>}
                  </button>
                  <div className="space-y-1.5">
                    {dayItems.slice(0, 3).map(item => <CalendarCard key={item.id} item={item} compact />)}
                    {dayItems.length > 3 && <p className="text-[11px] font-medium text-neutral-400">+{dayItems.length - 3} more</p>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="md:hidden divide-y divide-neutral-100 border-t border-neutral-100">
        {items.length ? [...items].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 8).map(item => <CalendarCard key={item.id} item={item} />) : <EmptyCalendar />}
      </div>
    </>
  )
}

function WeekView({ days, getItems, onSelectDay }: { days: Date[]; getItems: (day: Date) => PlannerItem[]; onSelectDay: (day: Date) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 border-t border-neutral-100">
      {days.map(day => {
        const dayItems = getItems(day)
        return (
          <div key={dateKey(day)} className="min-h-96 border-b md:border-r border-neutral-100 p-3 last:border-r-0">
            <button type="button" onClick={() => onSelectDay(day)} className="mb-3 flex w-full items-center justify-between rounded-lg hover:bg-neutral-50">
              <span>
                <span className="block text-xs font-medium uppercase tracking-wider text-neutral-400">{weekdays[day.getDay()]}</span>
                <span className={`mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${sameDate(day, new Date()) ? 'bg-brand text-on-brand' : 'text-ink'}`}>{day.getDate()}</span>
              </span>
              <span className="badge badge-neutral">{dayItems.length}</span>
            </button>
            <div className="space-y-2">
              {dayItems.length ? dayItems.map(item => <CalendarCard key={item.id} item={item} compact />) : <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400">Open</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayView({ day, items }: { day: Date; items: PlannerItem[] }) {
  return (
    <div className="border-t border-neutral-100 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{weekdays[day.getDay()]}</p>
          <h3 className="text-xl font-semibold text-ink">{formatDate(dateKey(day))}</h3>
        </div>
        <span className="badge badge-neutral">{items.length} planned</span>
      </div>
      <div className="space-y-3">
        {items.length ? items.map(item => <CalendarCard key={item.id} item={item} />) : <EmptyCalendar />}
      </div>
    </div>
  )
}

function HourView({ hours, getItems }: { hours: string[]; getItems: (hour: string) => PlannerItem[] }) {
  return (
    <div className="border-t border-neutral-100">
      {hours.map(hour => {
        const items = getItems(hour)
        return (
          <div key={hour} className="grid grid-cols-[72px_1fr] border-b border-neutral-100">
            <div className="border-r border-neutral-100 px-3 py-4 text-xs font-medium text-neutral-400">{formatTime(hour)}</div>
            <div className="min-h-20 p-3">
              {items.length ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {items.map(item => <CalendarCard key={item.id} item={item} compact />)}
                </div>
              ) : (
                <span className="text-xs text-neutral-300">No content planned</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyCalendar() {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
      Nothing planned here yet
    </div>
  )
}

function CalendarCard({ item, compact = false }: { item: PlannerItem; compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 shadow-sm">
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${channelStyles[item.channel]}`}>{item.channel}</span>
        <p className="mt-1 text-xs font-medium leading-snug text-ink line-clamp-2">{item.title}</p>
        <p className="mt-1 text-[11px] text-neutral-400">{formatTime(item.time)}</p>
      </div>
    )
  }

  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`badge ${channelStyles[item.channel]}`}>{item.channel}</span>
          <h3 className="mt-2 font-medium text-ink">{item.title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{formatDate(item.date)} · {formatTime(item.time)} · {item.theme}</p>
        </div>
        <span className="badge badge-neutral">{item.status}</span>
      </div>
    </article>
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
