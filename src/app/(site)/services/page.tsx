
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Tick02Icon, WhatsappIcon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { getBrand } from '@/lib/brand'
import { getSettings } from '@/lib/settings'
import { Metadata } from 'next'
import Eyebrow from '@/components/Eyebrow'
import StickerIcon, { type StickerName } from '@/components/StickerIcon'

export const metadata: Metadata = {
  title: 'Services',
  description: 'Comprehensive real estate services in Abuja - property sales, acquisition, consulting, and investment advisory.',
}

const services: { id: string; icon: StickerName; title: string; subtitle: string; description: string; features: string[] }[] = [
  {
    id: 'sales',
    icon: 'home',
    title: 'Property Sales',
    subtitle: 'Sell with confidence',
    description: 'When you sell through us, you gain access to our network of qualified buyers, professional marketing, and expert negotiation. We position your property to achieve optimal value while handling every detail of the sales process.',
    features: [
      'Professional property valuation',
      'Premium listing presentation',
      'Targeted buyer matching',
      'Expert negotiation support',
      'Transaction coordination',
      'Legal documentation assistance',
    ],
  },
  {
    id: 'acquisition',
    icon: 'key',
    title: 'Property Acquisition',
    subtitle: 'Find your perfect property',
    description: 'Whether you\'re seeking a family home, investment property, or commercial space, our acquisition service ensures you find the right property at the right price. We leverage our market knowledge to identify opportunities that match your criteria.',
    features: [
      'Personalized property search',
      'Off-market access',
      'Property inspections',
      'Due diligence support',
      'Price negotiation',
      'Closing assistance',
    ],
  },
  {
    id: 'consulting',
    icon: 'analytics',
    title: 'Real Estate Consulting',
    subtitle: 'Expert guidance when you need it',
    description: 'Our consulting services provide the strategic insight you need to make informed real estate decisions. From market analysis to project feasibility, we deliver the expertise that drives successful outcomes.',
    features: [
      'Market analysis reports',
      'Property valuation',
      'Investment feasibility',
      'Portfolio review',
      'Development consulting',
      'Location analysis',
    ],
  },
  {
    id: 'investment',
    icon: 'wallet',
    title: 'Investment Advisory',
    subtitle: 'Build wealth through property',
    description: 'For investors seeking to build or expand their real estate portfolio in Abuja, our advisory service provides the strategic guidance needed to identify high-potential opportunities and optimize returns.',
    features: [
      'Investment strategy development',
      'Opportunity identification',
      'Risk assessment',
      'Return analysis',
      'Portfolio diversification',
      'Exit planning',
    ],
  },
]

export default async function ServicesPage() {
  const [brand, settings] = await Promise.all([getBrand(), getSettings()])
  return (
    <div className="pt-16 lg:pt-20">
      {/* Hero Section */}
      <section className="py-24 bg-brand-soft">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <Eyebrow icon="documents" className="mb-5">Our Services</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-semibold text-ink mb-6">
              Comprehensive Real Estate Solutions
            </h1>
            <p className="text-xl text-neutral-600 leading-relaxed">
              From finding your dream home to building an investment portfolio,
              {brand.name} delivers expert guidance at every stage of your real estate journey.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-24">
            {services.map((service, index) => (
              <div
                key={service.id}
                id={service.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${
                  index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                }`}
              >
                {/* Content */}
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <Eyebrow icon={service.icon} className="mb-3">{service.subtitle}</Eyebrow>
                  <h2 className="text-3xl font-semibold text-ink mb-4">
                    {service.title}
                  </h2>
                  <p className="text-neutral-600 leading-relaxed mb-8">
                    {service.description}
                  </p>
                  <ul className="grid grid-cols-2 gap-3 mb-8">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                        <HugeiconsIcon icon={Tick02Icon} className="w-4 h-4 text-brand flex-shrink-0" strokeWidth={1.7} aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 text-sm font-medium text-ink hover:text-brand transition-colors"
                  >
                    Learn more
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                  </Link>
                </div>

                {/* Visual */}
                <div className={`rounded-xl bg-brand-soft p-12 ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center text-center">
                      <StickerIcon name={service.icon} size={132} className="mb-6" />
                      <Eyebrow tone="muted" center>
                        {String(index + 1).padStart(2, '0')} · {service.title}
                      </Eyebrow>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-brand">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
              How We Work
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Our process is designed to be transparent, efficient, and focused on your goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <StickerIcon name="call" size={64} className="mx-auto mb-4" />
              <Eyebrow tone="light" size="xs" center className="mb-2">Step 01</Eyebrow>
              <h3 className="font-semibold text-white mb-2">Consultation</h3>
              <p className="text-sm text-white/80">
                We begin by understanding your goals, timeline, and requirements.
              </p>
            </div>

            <div className="text-center">
              <StickerIcon name="map" size={64} className="mx-auto mb-4" />
              <Eyebrow tone="light" size="xs" center className="mb-2">Step 02</Eyebrow>
              <h3 className="font-semibold text-white mb-2">Strategy</h3>
              <p className="text-sm text-white/80">
                We develop a tailored approach based on your specific situation.
              </p>
            </div>

            <div className="text-center">
              <StickerIcon name="documents" size={64} className="mx-auto mb-4" />
              <Eyebrow tone="light" size="xs" center className="mb-2">Step 03</Eyebrow>
              <h3 className="font-semibold text-white mb-2">Execution</h3>
              <p className="text-sm text-white/80">
                We implement the strategy with precision and regular updates.
              </p>
            </div>

            <div className="text-center">
              <StickerIcon name="key" size={64} className="mx-auto mb-4" />
              <Eyebrow tone="light" size="xs" center className="mb-2">Step 04</Eyebrow>
              <h3 className="font-semibold text-white mb-2">Completion</h3>
              <p className="text-sm text-white/80">
                We ensure a smooth closing and continued support as needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-soft">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
            Contact us today to discuss your real estate needs and discover how
            {brand.name} can help you achieve your goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="rounded-lg px-8 py-4 bg-brand text-white text-sm font-medium uppercase tracking-wider hover:bg-brand-dark transition-colors"
            >
              Contact Us
            </Link>
            <a
              href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-8 py-4 border border-ink text-ink text-sm font-medium uppercase tracking-wider hover:bg-brand hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
