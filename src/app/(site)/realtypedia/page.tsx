import { Metadata } from 'next'
import Link from 'next/link'
import Eyebrow from '@/components/Eyebrow'
import StickerIcon from '@/components/StickerIcon'
import RealtypediaIndex from '@/components/RealtypediaIndex'
import { CATEGORIES, ENTRIES } from '@/data/realtypedia'

export const metadata: Metadata = {
  title: 'Realtypedia',
  description: 'Plain-language explanations of Abuja property terms: C of O, Minister’s Consent, AGIS, ground rent, off-plan buying, service charges and more.',
}

export default function RealtypediaPage() {
  return (
    <div className="pt-16 lg:pt-20">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-brand-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1fr_auto] gap-10 items-center">
          <div className="max-w-3xl">
            <Eyebrow icon="guides" className="mb-5">Realtypedia</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-semibold text-ink mb-6 text-balance">
              Abuja property, explained in plain words
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 leading-relaxed">
              {ENTRIES.length} terms you’ll meet when buying, renting or investing in the FCT, from titles and
              consent to service charges. Each one links to the terms around it, so you can follow a deal from start to finish.
            </p>
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-3" aria-hidden="true">
            {CATEGORIES.slice(0, 3).map(c => <StickerIcon key={c.id} name={c.icon} size={88} />)}
            <span />
            {CATEGORIES.slice(3).map(c => <StickerIcon key={c.id} name={c.icon} size={88} />)}
          </div>
        </div>
      </section>

      {/* Index */}
      <section className="py-12 md:py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RealtypediaIndex />
        </div>
      </section>

      {/* Help */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <StickerIcon name="verified" size={80} className="mx-auto mb-5" />
          <h2 className="text-3xl font-semibold text-ink mb-4">Looking at a property right now?</h2>
          <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
            Realtypedia gives general information, not legal advice. Before you pay for anything, we can check the title,
            confirm the plot on the ground and walk you through every document.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="btn btn-lg btn-brand">Ask us to verify a property</Link>
            <Link href="/resources" className="btn btn-lg btn-secondary">Download checklists</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
