import Link from 'next/link'
import Image from 'next/image'
import PropertySearch from '@/components/PropertySearch'
import PropertyCard from '@/components/PropertyCard'
import InstagramFeed from '@/components/InstagramFeed'
import { getFeaturedProperties } from '@/lib/properties'
import { testimonials, districts } from '@/data/properties'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const featuredProperties = await getFeaturedProperties()

  return (
    <>
      {/* Hero Section - Search First */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920"
            alt="Luxury home in Abuja"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight">
            Find Your Perfect Property
            <span className="block font-medium">in Abuja</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Sabi Consults offers expert guidance for premium real estate in Nigeria&apos;s capital city
          </p>

          {/* Search Module */}
          <div className="max-w-3xl mx-auto">
            <PropertySearch variant="hero" />
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-2">
                Curated Selection
              </p>
              <h2 className="text-3xl md:text-4xl font-light text-[#1a1a1a]">
                Featured Properties
              </h2>
            </div>
            <Link
              href="/properties"
              className="mt-4 md:mt-0 text-sm font-medium text-[#1a1a1a] hover:text-[#0055CC] transition-colors flex items-center gap-2"
            >
              View All Properties
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} variant="featured" />
            ))}
          </div>
        </div>
      </section>

      {/* Districts Section */}
      <section className="py-24 bg-[#f8f6f3]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-2">
              Explore
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-[#1a1a1a]">
              Premium Abuja Districts
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {districts.slice(0, 8).map((district) => (
              <Link
                key={district.id}
                href={`/properties?district=${district.name}`}
                className="group bg-white p-6 hover:bg-[#0055CC] transition-colors duration-300"
              >
                <h3 className="text-lg font-medium text-[#1a1a1a] group-hover:text-white transition-colors">
                  {district.name}
                </h3>
                <p className="text-sm text-neutral-500 group-hover:text-white/80 mt-1 transition-colors">
                  {district.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Sabi Consults */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-2">
                Why Choose Us
              </p>
              <h2 className="text-3xl md:text-4xl font-light text-[#1a1a1a] mb-6">
                Deep Local Expertise.<br />Trusted Guidance.
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-8">
                &quot;Sabi&quot; means to know deeply in Nigerian Pidgin. At Sabi Consults, we embody this
                philosophy. Our team brings unmatched knowledge of Abuja&apos;s real estate landscape,
                from established districts like Maitama and Asokoro to emerging opportunities in
                Katampe and beyond.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#f8f6f3] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#0055CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1a1a1a] mb-1">Verified Properties</h3>
                    <p className="text-sm text-neutral-600">Every listing is personally vetted by our team</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#f8f6f3] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#0055CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1a1a1a] mb-1">Diaspora Friendly</h3>
                    <p className="text-sm text-neutral-600">Trusted partner for overseas Nigerians</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#f8f6f3] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#0055CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1a1a1a] mb-1">End-to-End Support</h3>
                    <p className="text-sm text-neutral-600">From search to closing, we guide every step</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] relative">
                <Image
                  src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
                  alt="Modern home interior"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Stats overlay */}
              <div className="absolute -bottom-8 -left-8 bg-[#1a1a1a] text-white p-8">
                <div className="text-4xl font-light mb-2">10+</div>
                <div className="text-sm text-neutral-400">Years in Abuja Real Estate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-2">
              Client Stories
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-white">
              Trusted by Clients
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-[#2d2d2d] p-8">
                <svg className="w-8 h-8 text-[#0055CC] mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-neutral-300 leading-relaxed mb-6">
                  {testimonial.content}
                </p>
                <div>
                  <p className="font-medium text-white">{testimonial.name}</p>
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
      <section className="py-24 bg-[#0055CC]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-6">
            Ready to Find Your Property?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re looking for land or a house in Abuja,
            our team is ready to provide the expert guidance you deserve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/properties?type=house"
              className="px-8 py-4 bg-white text-[#0055CC] text-sm font-medium uppercase tracking-wider hover:bg-neutral-100 transition-colors"
            >
              Browse Houses
            </Link>
            <Link
              href="/properties?type=land"
              className="px-8 py-4 border-2 border-white text-white text-sm font-medium uppercase tracking-wider hover:bg-white hover:text-[#0055CC] transition-colors"
            >
              Browse Land
            </Link>
          </div>
          <div className="mt-8">
            <a
              href="https://wa.me/2349160531000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Or chat with us on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
