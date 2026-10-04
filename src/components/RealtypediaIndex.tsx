'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import StickerIcon from './StickerIcon'
import { CATEGORIES, ENTRIES, categoryById, type CategoryId } from '@/data/realtypedia'

const sortKey = (term: string) => term.replace(/^[^A-Za-z0-9]+/, '').toUpperCase()
const SORTED = [...ENTRIES].sort((a, b) => sortKey(a.term).localeCompare(sortKey(b.term)))
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Search names, summaries and the full explanation, with link markup stripped
const HAYSTACK = new Map(ENTRIES.map(e => [
  e.slug,
  [e.term, ...(e.aka || []), e.summary, ...e.body, ...(e.checklist || []), e.watchOut || '']
    .join(' ')
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, (_, slug: string) => slug.replace(/-/g, ' '))
    .toLowerCase(),
]))

function matches(q: string, e: (typeof ENTRIES)[number]) {
  if (!q) return true
  const hay = HAYSTACK.get(e.slug)!
  return q.toLowerCase().split(/\s+/).every(word => hay.includes(word))
}

export default function RealtypediaIndex() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')

  // Read ?q= and ?topic= once so searches can be shared as links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const t = params.get('topic') as CategoryId | null
    if (q) setQuery(q.slice(0, 80))
    if (t && categoryById.has(t)) setCategory(t)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category !== 'all') params.set('topic', category)
    const qs = params.toString()
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [query, category])

  const results = useMemo(
    () => SORTED.filter(e => (category === 'all' || e.category === category) && matches(query.trim(), e)),
    [query, category],
  )
  const groups = useMemo(() => {
    const map = new Map<string, typeof results>()
    for (const e of results) {
      const letter = sortKey(e.term)[0]
      map.set(letter, [...(map.get(letter) || []), e])
    }
    return map
  }, [results])
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 }
    for (const e of SORTED) if (matches(query.trim(), e)) { c.all++; c[e.category] = (c[e.category] || 0) + 1 }
    return c
  }, [query])

  return (
    <div className="grid gap-8">
      {/* Search */}
      <div className="relative max-w-2xl">
        <label htmlFor="realtypedia-search" className="sr-only">Search Realtypedia</label>
        <HugeiconsIcon icon={Search01Icon} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" strokeWidth={1.7} aria-hidden="true" />
        <input
          id="realtypedia-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search a term, like C of O, consent or service charge"
          className="w-full h-14 pl-12 pr-12 rounded-xl bg-white border border-neutral-200 text-base text-ink placeholder:text-neutral-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition"
          autoComplete="off"
          maxLength={80}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg grid place-items-center text-neutral-400 hover:text-ink hover:bg-neutral-100">
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Topics */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        {[{ id: 'all' as const, label: 'All terms' }, ...CATEGORIES].map(c => {
          const active = category === c.id
          const n = counts[c.id] || 0
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c.id)}
              disabled={n === 0 && !active}
              className={`h-10 pl-2 pr-3.5 rounded-full border text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 ${
                active ? 'bg-brand border-brand text-on-brand' : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand/40 hover:text-ink'
              } ${c.id === 'all' ? 'pl-3.5' : ''}`}
            >
              {c.id !== 'all' && <StickerIcon name={categoryById.get(c.id)!.icon} size={26} />}
              {c.label}
              <span className={`tabular-nums text-xs ${active ? 'text-on-brand/75' : 'text-neutral-400'}`}>{n}</span>
            </button>
          )
        })}
      </div>

      {/* A–Z jump bar */}
      <nav aria-label="Jump to letter" className="flex flex-wrap gap-1 border-y border-neutral-200 py-3">
        {ALPHABET.map(l => groups.has(l) ? (
          <a key={l} href={`#letter-${l}`} className="w-8 h-8 rounded-md grid place-items-center text-sm font-medium text-ink hover:bg-brand-soft hover:text-brand transition-colors">{l}</a>
        ) : (
          <span key={l} className="w-8 h-8 grid place-items-center text-sm text-neutral-300" aria-hidden="true">{l}</span>
        ))}
      </nav>

      <p className="text-sm text-neutral-500" role="status" aria-live="polite">
        {results.length === ENTRIES.length ? `${results.length} terms` : `${results.length} of ${ENTRIES.length} terms`}
      </p>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-xl bg-white border border-neutral-200 p-10 text-center">
          <StickerIcon name="search" size={72} className="mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">No terms match “{query}”</p>
          <p className="text-sm text-neutral-500 mb-5">Try a shorter word, or ask us and we’ll explain it.</p>
          <button type="button" onClick={() => { setQuery(''); setCategory('all') }} className="btn btn-md btn-secondary">Show all terms</button>
        </div>
      ) : (
        <div className="grid gap-10">
          {[...groups.entries()].map(([letter, entries]) => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-28 grid md:grid-cols-[4rem_1fr] gap-3 md:gap-6">
              <h2 className="text-3xl font-semibold text-brand/80 leading-none md:pt-4">{letter}</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {entries.map(e => {
                  const cat = categoryById.get(e.category)!
                  return (
                    <li key={e.slug} className="min-w-0">
                      <Link href={`/realtypedia/${e.slug}`}
                        className="group h-full flex gap-4 rounded-xl bg-white border border-neutral-200 p-4 hover:border-brand/40 hover:shadow-sm transition">
                        <StickerIcon name={cat.icon} size={44} className="mt-0.5" />
                        <span className="min-w-0 grid gap-1">
                          <span className="font-semibold text-ink group-hover:text-brand transition-colors">
                            {e.term}
                            {e.aka?.[0] && e.aka[0].length <= 6 && <span className="ml-2 text-xs font-medium text-neutral-400">{e.aka[0]}</span>}
                          </span>
                          <span className="text-sm text-neutral-600 leading-relaxed">{e.summary}</span>
                          <span className="text-xs text-neutral-400">{cat.label}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
