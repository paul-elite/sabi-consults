import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Services | Sabi Consults',
  description: 'Comprehensive real estate services in Abuja - property sales, acquisition, consulting, and investment advisory.',
}

const services = [
  {
    id: 'sales',
    title: 'Property Sales',
    subtitle: 'Sell with confidence',
    description: 'When you sell through Sabi Consults, you gain access to our network of qualified buyers, professional marketing, and expert negotiation. We position your property to achieve optimal value while handling every detail of the sales process.',
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

export default function ServicesPage() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-24 bg-[#f8f6f3]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-4">
              Our Services
            </p>
            <h1 className="text-4xl md:text-5xl font-light text-[#1a1a1a] mb-6">
              Comprehensive Real Estate Solutions
            </h1>
            <p className="text-xl text-neutral-600 leading-relaxed">
              From finding your dream home to building an investment portfolio,
              Sabi Consults delivers expert guidance at every stage of your real estate journey.
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
                  <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-2">
                    {service.subtitle}
                  </p>
                  <h2 className="text-3xl font-light text-[#1a1a1a] mb-4">
                    {service.title}
                  </h2>
                  <p className="text-neutral-600 leading-relaxed mb-8">
                    {service.description}
                  </p>
                  <ul className="grid grid-cols-2 gap-3 mb-8">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                        <svg className="w-4 h-4 text-[#0055CC] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a1a] hover:text-[#0055CC] transition-colors"
                  >
                    Learn more
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Visual */}
                <div className={`bg-[#f8f6f3] p-12 ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="text-7xl font-light text-[#0055CC] mb-4">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="text-sm uppercase tracking-wider text-neutral-500">
                        {service.title}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
              How We Work
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Our process is designed to be transparent, efficient, and focused on your goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-[#0055CC] flex items-center justify-center">
                <span className="text-xl font-light text-[#0055CC]">01</span>
              </div>
              <h3 className="font-medium text-white mb-2">Consultation</h3>
              <p className="text-sm text-neutral-400">
                We begin by understanding your goals, timeline, and requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-[#0055CC] flex items-center justify-center">
                <span className="text-xl font-light text-[#0055CC]">02</span>
              </div>
              <h3 className="font-medium text-white mb-2">Strategy</h3>
              <p className="text-sm text-neutral-400">
                We develop a tailored approach based on your specific situation.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-[#0055CC] flex items-center justify-center">
                <span className="text-xl font-light text-[#0055CC]">03</span>
              </div>
              <h3 className="font-medium text-white mb-2">Execution</h3>
              <p className="text-sm text-neutral-400">
                We implement the strategy with precision and regular updates.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-[#0055CC] flex items-center justify-center">
                <span className="text-xl font-light text-[#0055CC]">04</span>
              </div>
              <h3 className="font-medium text-white mb-2">Completion</h3>
              <p className="text-sm text-neutral-400">
                We ensure a smooth closing and continued support as needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#f8f6f3]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-[#1a1a1a] mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
            Contact us today to discuss your real estate needs and discover how
            Sabi Consults can help you achieve your goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-[#1a1a1a] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#2d2d2d] transition-colors"
            >
              Contact Us
            </Link>
            <a
              href="https://wa.me/2348000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-[#1a1a1a] text-[#1a1a1a] text-sm font-medium uppercase tracking-wider hover:bg-[#1a1a1a] hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
