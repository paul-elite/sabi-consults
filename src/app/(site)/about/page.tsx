import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Sabi Consults',
  description: 'Learn about Sabi Consults - your trusted partner for premium real estate in Abuja, Nigeria.',
}

export default function AboutPage() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative py-24 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-4">
              About Us
            </p>
            <h1 className="text-4xl md:text-5xl font-light text-white mb-6">
              We Know Abuja.<br />We Know Real Estate.
            </h1>
            <p className="text-xl text-neutral-400 leading-relaxed">
              Sabi Consults is a premium real estate consultancy built on deep local expertise
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
              <div className="aspect-[4/5] relative">
                <Image
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
                  alt="Sabi Consults team"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-[#0055CC] text-white p-8">
                <div className="text-4xl font-light mb-1">Sabi</div>
                <div className="text-sm text-white/80">/sah-bee/ verb. To know deeply.</div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-light text-[#1a1a1a] mb-6">
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
                  Founded by professionals with deep roots in Abuja&apos;s property market, Sabi
                  Consults exists to be the trusted partner our clients deserve—one that combines
                  local insight with professional excellence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-[#f8f6f3]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-[#1a1a1a] mb-4">
              What Guides Us
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Our values aren&apos;t just words—they shape every interaction, every recommendation,
              and every outcome we deliver.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10">
              <div className="w-12 h-12 bg-[#f8f6f3] flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#0055CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-[#1a1a1a] mb-3">Trust First</h3>
              <p className="text-neutral-600">
                Every recommendation we make is grounded in your best interest. We build
                relationships for the long term, not quick transactions.
              </p>
            </div>

            <div className="bg-white p-10">
              <div className="w-12 h-12 bg-[#f8f6f3] flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#0055CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-[#1a1a1a] mb-3">Deep Expertise</h3>
              <p className="text-neutral-600">
                We know Abuja&apos;s real estate market intimately—the districts, the developers,
                the trends, and the opportunities others miss.
              </p>
            </div>

            <div className="bg-white p-10">
              <div className="w-12 h-12 bg-[#f8f6f3] flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#0055CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-[#1a1a1a] mb-3">Client Partnership</h3>
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
              <h2 className="text-3xl font-light text-[#1a1a1a] mb-6">
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
              <div className="flex gap-6 p-6 bg-[#f8f6f3]">
                <div className="text-4xl font-light text-[#0055CC]">01</div>
                <div>
                  <h3 className="font-medium text-[#1a1a1a] mb-2">Local Market Intelligence</h3>
                  <p className="text-sm text-neutral-600">
                    Real-time insights into pricing trends, new developments, and market movements.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-6 bg-[#f8f6f3]">
                <div className="text-4xl font-light text-[#0055CC]">02</div>
                <div>
                  <h3 className="font-medium text-[#1a1a1a] mb-2">Verified Properties</h3>
                  <p className="text-sm text-neutral-600">
                    Every listing is personally inspected and documented by our team.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-6 bg-[#f8f6f3]">
                <div className="text-4xl font-light text-[#0055CC]">03</div>
                <div>
                  <h3 className="font-medium text-[#1a1a1a] mb-2">Due Diligence Support</h3>
                  <p className="text-sm text-neutral-600">
                    Comprehensive verification of titles, documentation, and property history.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-6 bg-[#f8f6f3]">
                <div className="text-4xl font-light text-[#0055CC]">04</div>
                <div>
                  <h3 className="font-medium text-[#1a1a1a] mb-2">Transaction Management</h3>
                  <p className="text-sm text-neutral-600">
                    End-to-end support from negotiation through closing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-6">
            Let&apos;s Work Together
          </h2>
          <p className="text-neutral-400 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re buying your first home, expanding your portfolio, or seeking
            expert guidance on the Abuja market, we&apos;re here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-white text-[#1a1a1a] text-sm font-medium uppercase tracking-wider hover:bg-neutral-100 transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/properties"
              className="px-8 py-4 border border-white text-white text-sm font-medium uppercase tracking-wider hover:bg-white hover:text-[#1a1a1a] transition-colors"
            >
              View Properties
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
