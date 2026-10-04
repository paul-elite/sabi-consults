
import Image from 'next/image'
import { getBrand } from '@/lib/brand'
import Link from 'next/link'
import { Metadata } from 'next'
import TeamSection from '@/components/TeamSection'
import Eyebrow from '@/components/Eyebrow'
import StickerIcon from '@/components/StickerIcon'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about us: your trusted partner for premium real estate in Abuja, Nigeria.',
}

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const brand = await getBrand()
  return (
    <div className="pt-16 lg:pt-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-brand">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <Eyebrow icon="location" tone="light" className="mb-5">About Us</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-semibold text-white mb-6">
              We Know Abuja.<br />We Know Real Estate.
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              {brand.name} is a premium real estate consultancy built on deep local expertise
              and an unwavering commitment to client success.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="rounded-xl overflow-hidden aspect-[4/5] relative">
                <Image
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
                  alt={`${brand.name} team`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="rounded-xl absolute -bottom-8 -right-8 bg-brand text-white p-8">
                <div className="text-4xl font-light mb-1">{brand.name.split(' ')[0]}</div>
                <div className="text-sm text-white/80">/sah-bee/ verb. To know deeply.</div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-semibold text-ink mb-6">
                The Meaning Behind Our Name
              </h2>
              <div className="space-y-4 text-neutral-600 leading-relaxed">
                <p>
                  In Nigerian Pidgin, &quot;sabi&quot; means to know—not superficially, but deeply and
                  thoroughly. When you &quot;sabi&quot; something, you understand it inside and out.
                  You can navigate its complexities with confidence.
                </p>
                <p>
                  This is the philosophy we bring to Abuja real estate. We don&apos;t just list
                  properties; we understand the nuances of every district, the trajectory of
                  every neighborhood, and the true value behind every listing.
                </p>
                <p>
                  Founded by professionals with deep roots in Abuja&apos;s property market, {brand.name}{' '}
                  exists to be the trusted partner our clients deserve—one that combines
                  local insight with professional excellence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-brand-soft">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-4">
              What Guides Us
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Our values aren&apos;t just words—they shape every interaction, every recommendation,
              and every outcome we deliver.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl bg-white p-10">
              <StickerIcon name="verified" size={56} className="mb-6" />
              <h3 className="text-xl font-semibold text-ink mb-3">Trust First</h3>
              <p className="text-neutral-600">
                Every recommendation we make is grounded in your best interest. We build
                relationships for the long term, not quick transactions.
              </p>
            </div>

            <div className="rounded-xl bg-white p-10">
              <StickerIcon name="guides" size={56} className="mb-6" />
              <h3 className="text-xl font-semibold text-ink mb-3">Deep Expertise</h3>
              <p className="text-neutral-600">
                We know Abuja&apos;s real estate market intimately—the districts, the developers,
                the trends, and the opportunities others miss.
              </p>
            </div>

            <div className="rounded-xl bg-white p-10">
              <StickerIcon name="clients" size={56} className="mb-6" />
              <h3 className="text-xl font-semibold text-ink mb-3">Client Partnership</h3>
              <p className="text-neutral-600">
                We work alongside you as partners, not just service providers. Your success
                is our success, and we&apos;re invested in every outcome.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Abuja Expertise */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl font-semibold text-ink mb-6">
                Our Abuja Expertise
              </h2>
              <div className="space-y-4 text-neutral-600 leading-relaxed">
                <p>
                  Abuja isn&apos;t just any real estate market. As Nigeria&apos;s purpose-built capital,
                  it offers unique characteristics that require specialized knowledge to navigate.
                </p>
                <p>
                  From the diplomatic enclaves of Maitama to the exclusive streets of Asokoro,
                  from the vibrant energy of Wuse II to emerging opportunities in Katampe and
                  beyond—we understand what makes each district distinctive and which properties
                  represent genuine value.
                </p>
                <p>
                  Our team has closed transactions across every major district, built relationships
                  with key developers and stakeholders, and developed a network that opens doors
                  others can&apos;t reach.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl flex gap-6 p-6 bg-brand-soft">
                <div className="text-4xl font-light text-brand">01</div>
                <div>
                  <h3 className="font-semibold text-ink mb-2">Local Market Intelligence</h3>
                  <p className="text-sm text-neutral-600">
                    Real-time insights into pricing trends, new developments, and market movements.
                  </p>
                </div>
              </div>

              <div className="rounded-xl flex gap-6 p-6 bg-brand-soft">
                <div className="text-4xl font-light text-brand">02</div>
                <div>
                  <h3 className="font-semibold text-ink mb-2">Verified Properties</h3>
                  <p className="text-sm text-neutral-600">
                    Every listing is personally inspected and documented by our team.
                  </p>
                </div>
              </div>

              <div className="rounded-xl flex gap-6 p-6 bg-brand-soft">
                <div className="text-4xl font-light text-brand">03</div>
                <div>
                  <h3 className="font-semibold text-ink mb-2">Due Diligence Support</h3>
                  <p className="text-sm text-neutral-600">
                    Comprehensive verification of titles, documentation, and property history.
                  </p>
                </div>
              </div>

              <div className="rounded-xl flex gap-6 p-6 bg-brand-soft">
                <div className="text-4xl font-light text-brand">04</div>
                <div>
                  <h3 className="font-semibold text-ink mb-2">Transaction Management</h3>
                  <p className="text-sm text-neutral-600">
                    End-to-end support from negotiation through closing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <TeamSection />

      {/* CTA */}
      <section className="py-24 bg-brand">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
            Let&apos;s Work Together
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re buying your first home, expanding your portfolio, or seeking
            expert guidance on the Abuja market, we&apos;re here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="rounded-lg px-8 py-4 bg-white text-ink text-sm font-medium uppercase tracking-wider hover:bg-neutral-100 transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/properties"
              className="rounded-lg px-8 py-4 border border-white text-white text-sm font-medium uppercase tracking-wider hover:bg-white hover:text-ink transition-colors"
            >
              View Properties
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
