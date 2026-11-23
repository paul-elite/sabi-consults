import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Eyebrow from '@/components/Eyebrow'
import { GuideRequestForm, NewsletterForm } from '@/components/EmailCapture'

export const metadata: Metadata = {
  title: 'Free property guides',
  description: 'Practical guides to buying, documenting and investing in property in Abuja.',
}
export const revalidate = 300

interface Guide { slug: string; title: string; description: string | null }

// Read with the service key on the server: lead_magnets has no public policy
async function getGuides(): Promise<Guide[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { data } = await db.from('lead_magnets').select('slug, title, description').eq('active', true).not('file_url', 'is', null).order('sort_order')
  return (data || []) as Guide[]
}

export default async function GuidesPage() {
  const guides = await getGuides()
  return (
    <div className="pt-16 lg:pt-20">
      <section className="py-16 md:py-24 bg-brand-soft">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <Eyebrow icon="guides" className="mb-5">Guides</Eyebrow>
          <h1 className="text-4xl md:text-5xl font-semibold text-ink mb-5">Free guides to property in Abuja</h1>
          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
            Straightforward guides written by our consultants. Enter your email and we’ll send you a copy.
          </p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          {guides.length ? (
            <div className="grid md:grid-cols-2 gap-6">
              {guides.map(g => (
                <article key={g.slug} className="rounded-xl border border-neutral-200 p-6 flex flex-col">
                  <h2 className="text-xl font-semibold text-ink mb-2">{g.title}</h2>
                  {g.description && <p className="text-neutral-600 mb-5">{g.description}</p>}
                  <div className="mt-auto"><GuideRequestForm slug={g.slug} title={g.title} /></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-ink mb-3">Our guides are being prepared</h2>
              <p className="text-neutral-600 mb-8">
                Subscribe below and we’ll email you as soon as they’re ready. In the meantime, <Link href="/realtypedia" className="text-brand underline">Realtypedia</Link> explains
                common property terms, and our <Link href="/contact" className="text-brand underline">consultants</Link> are happy to answer questions.
              </p>
              <NewsletterForm source="guides_waitlist" />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
