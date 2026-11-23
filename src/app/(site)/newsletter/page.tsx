import type { Metadata } from 'next'
import Link from 'next/link'
import Eyebrow from '@/components/Eyebrow'
import { NewsletterForm } from '@/components/EmailCapture'
import { DISTRICTS } from '@/lib/districts'

export const metadata: Metadata = {
  title: 'Property updates by email',
  description: 'Get new homes and land in Abuja that match what you’re looking for, straight to your inbox.',
}

export default function NewsletterPage() {
  const districts = DISTRICTS.map(d => d.name).sort()
  return (
    <div className="pt-16 lg:pt-20">
      <section className="py-16 md:py-24 bg-brand-soft">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <Eyebrow icon="mail" className="mb-5">Newsletter</Eyebrow>
          <h1 className="text-4xl md:text-5xl font-semibold text-ink mb-5">New listings that match what you want</h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Tell us what you’re looking for and we’ll email you when a matching home or plot comes up in Abuja,
            along with occasional guides on buying, documentation and investing. Nothing else.
          </p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <NewsletterForm districts={districts} />
          <div className="mt-12 grid sm:grid-cols-3 gap-6 text-sm text-neutral-600">
            <div><p className="font-medium text-ink mb-1">Only what matches</p>Listings filtered by the areas, type and budget you choose.</div>
            <div><p className="font-medium text-ink mb-1">You set the pace</p>Instant alerts, a weekly summary, or important updates only.</div>
            <div><p className="font-medium text-ink mb-1">Leave any time</p>Every email has a link to change your choices or unsubscribe.</div>
          </div>
          <p className="mt-10 text-sm text-neutral-500">
            Looking for something specific right now? <Link href="/contact" className="text-brand underline">Talk to a consultant</Link>.
          </p>
        </div>
      </section>
    </div>
  )
}
