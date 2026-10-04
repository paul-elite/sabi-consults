'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, PauseIcon, PlayIcon } from '@hugeicons/core-free-icons'
import PropertySearch from './PropertySearch'
import type { Property } from '@/lib/types'
import { priceHeadline, propertyFacts, propertyCardName } from '@/lib/format'

type HeroShowcaseProps = {
  brandName: string
  properties: Property[]
}

const fallback = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920'
const HOLD_MS = 6500

/**
 * Home hero: featured listings slide behind the search. Autoplay pauses on
 * hover, keyboard focus, a hidden tab, an open details card, or the pause
 * button, and never runs for people who prefer reduced motion.
 */
export default function HeroShowcase({ brandName, properties }: HeroShowcaseProps) {
  const slides = useMemo(() => properties.filter(property => property.images[0]), [properties])
  const [index, setIndex] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const touchStart = useRef<number | null>(null)
  const openButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const detailsId = useId()

  const active = slides[index]
  const facts = active ? propertyFacts(active) : []
  const price = active ? priceHeadline(active) : null
  const name = active ? propertyCardName(active) : ''
  const multiple = slides.length > 1
  const autoplay = multiple && !paused && !reduced && !detailsOpen && !hovering && !focusWithin

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // One timer per slide, restarted after any change, and held while the tab is hidden
  useEffect(() => {
    if (!autoplay) return
    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      if (document.visibilityState === 'visible') {
        timer = window.setTimeout(() => setIndex(current => (current + 1) % slides.length), HOLD_MS)
      }
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', schedule) }
  }, [autoplay, index, slides.length])

  // Only slides the visitor chose are announced; autoplay stays silent
  const show = useCallback((next: number) => {
    if (!multiple) return
    const target = (next + slides.length) % slides.length
    setDetailsOpen(false)
    setIndex(target)
    setAnnouncement(`Property ${target + 1} of ${slides.length}: ${slides[target].district}`)
  }, [multiple, slides])

  const openDetails = () => {
    setDetailsOpen(true)
    requestAnimationFrame(() => closeButton.current?.focus())
  }
  const closeDetails = () => {
    setDetailsOpen(false)
    requestAnimationFrame(() => openButton.current?.focus())
  }

  const onTouchEnd = (x: number) => {
    if (touchStart.current === null) return
    const delta = x - touchStart.current
    touchStart.current = null
    if (Math.abs(delta) < 45) return
    show(index + (delta < 0 ? 1 : -1))
  }

  const panel = (visible: boolean) =>
    `[grid-area:1/1] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    }`

  return (
    <section
      className="relative min-h-[100svh] flex items-center justify-center pt-24 lg:pt-28 pb-20 overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured properties"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocusWithin(false) }}
      onKeyDown={event => { if (event.key === 'Escape' && detailsOpen) closeDetails() }}
      onTouchStart={event => {
        // Leave swipes inside form controls to the controls
        const target = event.target as HTMLElement
        touchStart.current = target.closest('input, select, textarea, [role="listbox"]') ? null : event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={event => onTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      {/* Photos */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-ink" aria-hidden="true">
        <div
          className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {(slides.length ? slides : [null]).map((property, slideIndex) => (
            <div key={property?.id || 'fallback'} className="relative h-full min-w-full">
              <Image
                src={property?.images[0] || fallback}
                alt=""
                fill
                className="object-cover"
                priority={slideIndex === 0}
                // Load neighbours ahead so a slide never arrives blank
                loading={slideIndex === 0 ? undefined : Math.abs(slideIndex - index) <= 1 ? 'eager' : 'lazy'}
                sizes="100vw"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/56 via-black/34 to-black/58" />
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      {multiple && (
        <div className="absolute inset-x-4 top-1/2 z-20 hidden md:flex -translate-y-1/2 justify-between pointer-events-none">
          <button type="button" onClick={() => show(index - 1)} className="pointer-events-auto h-11 w-11 rounded-full bg-white/85 text-ink shadow-sm grid place-items-center hover:bg-white transition-colors" aria-label="Previous property">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => show(index + 1)} className="pointer-events-auto h-11 w-11 rounded-full bg-white/85 text-ink shadow-sm grid place-items-center hover:bg-white transition-colors" aria-label="Next property">
            <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Both panels share one grid cell, so swapping them never shifts the layout */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 grid">
        <div className={`${panel(!detailsOpen)} text-center`} inert={detailsOpen || undefined}>
          <div className="mx-auto mb-8 sm:mb-12 max-w-3xl px-2">
            <h1 className="text-[34px] sm:text-5xl lg:text-6xl font-semibold text-white mb-4 sm:mb-6 leading-tight [text-shadow:0_3px_18px_rgba(0,0,0,0.45)]">
              Find Your Perfect Property
              <span className="block font-medium">in Abuja</span>
            </h1>
            <p className="text-base sm:text-xl text-white/90 max-w-2xl mx-auto [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
              {brandName} offers expert guidance for premium real estate in Nigeria&apos;s capital city
            </p>
            {active && (
              <button
                ref={openButton}
                type="button"
                onClick={openDetails}
                aria-expanded={detailsOpen}
                aria-controls={detailsId}
                className="mt-6 inline-flex items-center gap-2 min-h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm px-4 text-sm font-medium text-white border border-white/30 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                Featured in {active.district}
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="max-w-3xl mx-auto">
            <PropertySearch variant="hero" />
          </div>
        </div>

        {active && (
          <div
            id={detailsId}
            role="region"
            aria-label={`${active.district} property details`}
            inert={!detailsOpen || undefined}
            className={`${panel(detailsOpen)} self-center mx-auto w-full max-w-3xl rounded-3xl bg-white/95 p-5 sm:p-7 text-left shadow-xl`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{active.type}</p>
                <h2 className="mt-2 text-3xl sm:text-4xl font-semibold text-ink">{active.district}</h2>
                <p className="mt-2 text-sm text-neutral-500">{name}</p>
              </div>
              <button ref={closeButton} type="button" onClick={closeDetails} className="h-11 w-11 shrink-0 rounded-full bg-neutral-100 text-ink grid place-items-center hover:bg-neutral-200 transition-colors" aria-label="Close property details">
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <ul className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {facts.slice(0, 4).map(fact => (
                <li key={fact} className="rounded-2xl bg-neutral-100 px-4 py-3">
                  <p className="text-sm font-medium text-ink">{fact}</p>
                </li>
              ))}
              {price && (
                <li className="rounded-2xl bg-brand text-white px-4 py-3">
                  <p className="text-sm font-semibold">{price.label ? `${price.label} ` : ''}{price.amount}</p>
                </li>
              )}
            </ul>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href={`/properties/${active.id}`} className="rounded-xl bg-brand px-5 py-3 text-center text-sm font-medium text-white hover:bg-brand-dark transition-colors">
                View property details
              </Link>
              {multiple && (
                <button type="button" onClick={() => { show(index + 1); requestAnimationFrame(() => openButton.current?.focus()) }} className="rounded-xl bg-neutral-100 px-5 py-3 text-sm font-medium text-ink hover:bg-neutral-200 transition-colors">
                  See next property
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {multiple && (
        <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-2 px-4">
          <div className="flex items-center" role="group" aria-label="Choose a featured property">
            {slides.map((property, slideIndex) => (
              <button
                key={property.id}
                type="button"
                onClick={() => show(slideIndex)}
                aria-current={slideIndex === index ? 'true' : undefined}
                aria-label={`Property ${slideIndex + 1} of ${slides.length}: ${property.district}`}
                className="h-11 min-w-6 px-1 grid place-items-center group"
              >
                <span className={`block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${slideIndex === index ? 'w-7 bg-white' : 'w-2 bg-white/50 group-hover:bg-white/80'}`} />
              </button>
            ))}
          </div>
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused(p => !p)}
              aria-pressed={paused}
              aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
              className="h-11 w-11 rounded-full bg-black/30 text-white backdrop-blur-sm grid place-items-center hover:bg-black/45 transition-colors"
            >
              <HugeiconsIcon icon={paused ? PlayIcon : PauseIcon} className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
