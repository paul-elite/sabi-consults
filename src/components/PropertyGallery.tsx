'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

/** Swipeable on phones (scroll-snap), grid of three on desktop, full-screen viewer on tap. */
export default function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)

  const onScroll = () => {
    const el = track.current
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  if (images.length === 0) {
    return (
      <div className="rounded-xl overflow-hidden aspect-[4/3] sm:aspect-[21/9] bg-brand-soft grid place-items-center text-brand/40 text-sm">
        Photos coming soon
      </div>
    )
  }

  return (
    <>
      {/* Phones and tablets: swipe */}
      <div className="relative lg:hidden rounded-xl overflow-hidden">
        <div ref={track} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none aspect-[4/3] sm:aspect-[16/9] bg-brand-soft">
          {images.map((src, i) => (
            <button key={src + i} type="button" onClick={() => setViewer(i)} className="relative shrink-0 w-full h-full snap-center" aria-label={`Open photo ${i + 1} of ${images.length}`}>
              <Image src={src} alt={i === 0 ? title : ''} fill priority={i === 0} className="object-cover text-transparent" sizes="100vw" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium tabular-nums">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Desktop: large photo plus two */}
      <div className="hidden lg:grid max-w-7xl mx-auto px-8 pt-6 grid-cols-4 grid-rows-2 gap-2 h-[480px]">
        {images.slice(0, 3).map((src, i) => (
          <button key={src + i} type="button" onClick={() => setViewer(i)}
            className={`relative overflow-hidden bg-brand-soft rounded-xl group ${i === 0 ? 'col-span-3 row-span-2' : ''} ${images.length === 1 ? 'col-span-4' : ''} ${images.length === 2 && i === 1 ? 'row-span-2' : ''}`}
            aria-label={`Open photo ${i + 1} of ${images.length}`}>
            <Image src={src} alt={i === 0 ? title : ''} fill priority={i === 0} className="object-cover text-transparent transition-transform duration-500 group-hover:scale-[1.02]" sizes={i === 0 ? '75vw' : '25vw'} />
            {i === 2 && images.length > 3 && (
              <span className="absolute inset-0 bg-black/40 grid place-items-center text-white font-medium">+{images.length - 3} photos</span>
            )}
          </button>
        ))}
      </div>

      {/* Full-screen viewer */}
      {viewer !== null && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[2000] bg-black flex flex-col"
          onKeyDown={e => {
            if (e.key === 'Escape') setViewer(null)
            if (e.key === 'ArrowRight') setViewer(v => (v! + 1) % images.length)
            if (e.key === 'ArrowLeft') setViewer(v => (v! - 1 + images.length) % images.length)
          }} tabIndex={-1} ref={el => el?.focus()}>
          <div className="flex items-center justify-between px-4 h-14 pt-[env(safe-area-inset-top)] text-white">
            <span className="text-sm tabular-nums">{viewer + 1} / {images.length}</span>
            <button type="button" onClick={() => setViewer(null)} className="w-11 h-11 grid place-items-center" aria-label="Close">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={images[viewer]} alt="" fill className="object-contain" sizes="100vw" />
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => setViewer((viewer - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 text-white grid place-items-center" aria-label="Previous photo">‹</button>
                <button type="button" onClick={() => setViewer((viewer + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 text-white grid place-items-center" aria-label="Next photo">›</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
