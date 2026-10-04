import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon, WhatsappIcon } from '@hugeicons/core-free-icons'
import Eyebrow from '@/components/Eyebrow'
import StickerIcon from '@/components/StickerIcon'
import RealtypediaText from '@/components/RealtypediaText'
import { ENTRIES, categoryById, entryBySlug } from '@/data/realtypedia'
import { getSettings } from '@/lib/settings'

type Params = { params: Promise<{ slug: string }> }

const sortKey = (term: string) => term.replace(/^[^A-Za-z0-9]+/, '').toUpperCase()
const ALPHA = [...ENTRIES].sort((a, b) => sortKey(a.term).localeCompare(sortKey(b.term)))
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sabiconsults.com.ng'

export function generateStaticParams() {
  return ENTRIES.map(e => ({ slug: e.slug }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entry = entryBySlug.get((await params).slug)
  if (!entry) return {}
  const title = entry.aka?.length ? `${entry.term} (${entry.aka[0]})` : entry.term
  return {
    title: `${title} · Realtypedia`,
    description: entry.summary,
    alternates: { canonical: `/realtypedia/${entry.slug}` },
    openGraph: { title: `${entry.term}: Abuja property terms explained`, description: entry.summary, type: 'article' },
  }
}

export default async function RealtypediaEntryPage({ params }: Params) {
  const entry = entryBySlug.get((await params).slug)
  if (!entry) notFound()
  const settings = await getSettings()

  const category = categoryById.get(entry.category)!
  const related = (entry.related || []).map(s => entryBySlug.get(s)!).filter(Boolean)
  const sameTopic = ENTRIES.filter(e => e.category === entry.category && e.slug !== entry.slug)
  const i = ALPHA.findIndex(e => e.slug === entry.slug)
  const prev = ALPHA[(i - 1 + ALPHA.length) % ALPHA.length]
  const next = ALPHA[(i + 1) % ALPHA.length]
  const wa = `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I have a question about ${entry.term}.`)}`

  // Structured data so search engines can show the definition directly
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: entry.term,
    alternateName: entry.aka,
    description: entry.summary,
    url: `${SITE}/realtypedia/${entry.slug}`,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Realtypedia', url: `${SITE}/realtypedia` },
  }

  return (
    <div className="pt-16 lg:pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* Header */}
      <section className="py-12 md:py-16 bg-brand-soft">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/realtypedia" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand transition-colors mb-8">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            All terms
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <StickerIcon name={category.icon} size={104} />
            <div className="min-w-0">
              <Link href={`/realtypedia?topic=${category.id}`} className="inline-block mb-3 hover:opacity-80 transition-opacity">
                <Eyebrow>{category.label}</Eyebrow>
              </Link>
              <h1 className="text-4xl md:text-5xl font-semibold text-ink text-balance">{entry.term}</h1>
              {entry.aka && entry.aka.length > 0 && (
                <p className="mt-3 text-sm text-neutral-500">Also called {entry.aka.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-12">
          <article className="min-w-0 max-w-[68ch]">
            <p className="text-xl md:text-2xl text-ink leading-snug font-medium mb-8">{entry.summary}</p>

            <div className="grid gap-5 text-lg text-neutral-600 leading-relaxed">
              {entry.body.map((p, idx) => <p key={idx}><RealtypediaText text={p} /></p>)}
            </div>

            {entry.checklist && (
              <div className="mt-10 rounded-xl bg-neutral-50 border border-neutral-200 p-6">
                <Eyebrow icon="done" tone="muted" size="xs" className="mb-4">What to check</Eyebrow>
                <ul className="grid gap-3">
                  {entry.checklist.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-neutral-700 leading-relaxed">
                      <HugeiconsIcon icon={Tick02Icon} className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600" strokeWidth={2} aria-hidden="true" />
                      <span><RealtypediaText text={item} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {entry.watchOut && (
              <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-6 flex gap-4">
                <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6 shrink-0 text-amber-600" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Watch out</p>
                  <p className="text-amber-900/80 leading-relaxed"><RealtypediaText text={entry.watchOut} /></p>
                </div>
              </div>
            )}

            {related.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold text-ink mb-4">Related terms</h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {related.map(r => (
                    <li key={r.slug}>
                      <Link href={`/realtypedia/${r.slug}`} className="group h-full flex flex-col gap-1 rounded-xl border border-neutral-200 p-4 hover:border-brand/40 transition-colors">
                        <span className="font-semibold text-ink group-hover:text-brand transition-colors">{r.term}</span>
                        <span className="text-sm text-neutral-500 leading-relaxed">{r.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-12 text-sm text-neutral-400 leading-relaxed">
              General information about property in the FCT, not legal or tax advice. Rules, fees and processes change,
              so confirm the current position with AGIS, a lawyer or our team before you act.
            </p>

            {/* Alphabetical neighbours */}
            <nav aria-label="More terms" className="mt-8 pt-8 border-t border-neutral-200 grid grid-cols-2 gap-4">
              <Link href={`/realtypedia/${prev.slug}`} className="group min-w-0">
                <span className="flex items-center gap-1 text-xs text-neutral-400 mb-1"><HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />Previous</span>
                <span className="block font-medium text-ink group-hover:text-brand truncate">{prev.term}</span>
              </Link>
              <Link href={`/realtypedia/${next.slug}`} className="group min-w-0 text-right">
                <span className="flex items-center justify-end gap-1 text-xs text-neutral-400 mb-1">Next<HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="block font-medium text-ink group-hover:text-brand truncate">{next.term}</span>
              </Link>
            </nav>
          </article>

          {/* Sidebar */}
          <aside className="grid gap-6 content-start lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-xl bg-brand text-on-brand p-6">
              <p className="font-semibold mb-2">Need help with this?</p>
              <p className="text-sm text-on-brand/80 mb-5 leading-relaxed">Send us the document or listing and we’ll tell you what it means for your deal.</p>
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="btn btn-md w-full bg-white text-brand hover:bg-white/90 flex items-center justify-center gap-2">
                <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
                Ask on WhatsApp
              </a>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3">More in {category.label}</p>
              <ul className="grid gap-1">
                {sameTopic.map(e => (
                  <li key={e.slug}>
                    <Link href={`/realtypedia/${e.slug}`} className="block py-1.5 text-sm text-neutral-600 hover:text-brand transition-colors">{e.term}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

