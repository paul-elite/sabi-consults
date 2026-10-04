
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, QuoteDownIcon, WhatsappIcon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { getBrand } from '@/lib/brand'
import { getSettings } from '@/lib/settings'
import Image from 'next/image'
import PropertyCard from '@/components/PropertyCard'
import InstagramFeed from '@/components/InstagramFeed'
import { getFeaturedProperties, filterProperties } from '@/lib/properties'
import { testimonials, districts } from '@/data/properties'
import Eyebrow from '@/components/Eyebrow'
import StickerIcon from '@/components/StickerIcon'
import HeroShowcase from '@/components/HeroShowcase'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [brand, settings] = await Promise.all([getBrand(), getSettings()])
  const [featured, available] = await Promise.all([getFeaturedProperties(), filterProperties({})])
  // Top up with the newest listings so the section never looks empty
  const featuredProperties = [...featured, ...available.filter(p => !featured.some(f => f.id === p.id))].slice(0, 4)
  const counts = available.reduce<Record<string, number>>((acc, p) => { acc[p.district] = (acc[p.district] || 0) + 1; return acc }, {})
  const activeDistricts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, count]) => ({ name, count, description: districts.find(d => d.name === name)?.description || 'Abuja' }))

  return (
    <>
      {/* Hero Section - Search First */}
      <HeroShowcase brandName={brand.name} properties={featuredProperties} />

      {/* Featured Properties */}
      <section className="py-14 md:py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8 md:mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-ink">
                Featured Properties
              </h2>
            </div>
            <Link
              href="/properties"
              className="shrink-0 text-sm font-medium text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5 min-h-11 pt-1"
            >
              View all
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            </Link>
          </div>

          {/* Swipe on phones, grid from tablet up */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none">
            {featuredProperties.map((property) => (
              <div key={property.id} className="w-[82%] sm:w-auto shrink-0 snap-start">
                <PropertyCard property={property} variant="featured" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Districts Section */}
      <section className="py-14 md:py-24 bg-brand-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <Eyebrow icon="map" center className="mx-auto mb-3">Explore</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-semibold text-ink">
              Where we have properties
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {activeDistricts.map((district) => (
              <Link
                key={district.name}
                href={`/properties?district=${encodeURIComponent(district.name)}`}
                className="group bg-white rounded-xl p-4 md:p-6 hover:bg-brand transition-colors duration-300"
              >
                <h3 className="text-base md:text-lg font-semibold text-ink group-hover:text-white transition-colors flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                  {district.name}
                  <span className="text-xs font-normal text-neutral-400 group-hover:text-white/70">{district.count} {district.count === 1 ? 'listing' : 'listings'}</span>
                </h3>
                <p className="hidden sm:block text-sm text-neutral-500 group-hover:text-white/80 mt-1 transition-colors">
                  {district.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-14 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Eyebrow icon="home" className="mb-3">Why Choose Us</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-6 tracking-[2px]">
                Deep Local Expertise.<br /><span className="text-brand">Trusted Guidance.</span>
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-8">
                &quot;Sabi&quot; means to know deeply in Nigerian Pidgin. At {brand.name}, we embody this
                philosophy. Our team brings unmatched knowledge of Abuja&apos;s real estate landscape,
                from established districts like Maitama and Asokoro to emerging opportunities in
                Katampe and beyond.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <StickerIcon name="verified" size={48} />
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Verified Properties</h3>
                    <p className="text-sm text-neutral-600">Every listing is personally vetted by our team</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <StickerIcon name="clients" size={48} />
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Diaspora Friendly</h3>
                    <p className="text-sm text-neutral-600">Trusted partner for overseas Nigerians</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <StickerIcon name="flash" size={48} />
                  <div>
                    <h3 className="font-semibold text-ink mb-1">End-to-End Support</h3>
                    <p className="text-sm text-neutral-600">From search to closing, we guide every step</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-xl overflow-hidden aspect-[4/5] relative">
                <Image
                  src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
                  alt="Modern home interior"
                  fill
                  className="object-cover"
                />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 md:py-24 bg-brand-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow icon="clients" center className="mx-auto mb-3">Client Stories</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-semibold text-ink">
              Trusted by Clients
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="rounded-xl bg-white border border-blue-100 p-8">
                <HugeiconsIcon icon={QuoteDownIcon} className="w-8 h-8 text-brand mb-4" strokeWidth={1.7} aria-hidden="true" />
                <p className="text-neutral-600 leading-relaxed mb-6">
                  {testimonial.content}
                </p>
                <div>
                  <p className="font-semibold text-ink">{testimonial.name}</p>
                  <p className="text-sm text-neutral-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <InstagramFeed />

      {/* CTA Section */}
      <section className="py-14 md:py-24 bg-brand">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
            Ready to Find Your Property?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re looking for land or a house in Abuja,
            our team is ready to provide the expert guidance you deserve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/properties?type=house"
              className="rounded-lg px-8 py-4 bg-white text-brand text-sm font-medium uppercase tracking-wider hover:bg-neutral-100 transition-colors"
            >
              Browse Houses
            </Link>
            <Link
              href="/properties?type=land"
              className="rounded-lg px-8 py-4 bg-white/12 text-white text-sm font-medium uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Browse Land
            </Link>
          </div>
          <div className="mt-8">
            <a
              href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm"
            >
              <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              Or chat with us on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
