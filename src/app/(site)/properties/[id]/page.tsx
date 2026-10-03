
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, CallIcon, Location01Icon, Tick02Icon, WhatsappIcon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { getPropertyById } from '@/lib/properties'
import { formatNaira, formatPrice, priceHeadline, propertyFacts } from '@/lib/format'
import ContactForm from '@/components/ContactForm'
import MapWrapper from '@/components/MapWrapper'
import PropertyGallery from '@/components/PropertyGallery'

// Enable dynamic rendering (no static generation)
export const dynamic = 'force-dynamic'

interface PropertyPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params
  const p = await getPropertyById(id)
  if (!p) return { title: 'Property not found' }
  const { amount, label } = priceHeadline(p)
  return {
    title: p.title,
    description: `${p.type === 'land' ? 'Land' : 'Homes'} in ${p.district}, Abuja. ${label} ${amount}. ${p.description.slice(0, 120)}`,
    openGraph: { images: p.images[0] ? [p.images[0]] : undefined },
  }
}


export default async function PropertyDetailPage({ params }: PropertyPageProps) {
  const { id } = await params
  const [property, settings] = await Promise.all([getPropertyById(id), getSettings()])
  if (!property) notFound()

  const phone = settings.whatsapp_number.replace(/\D/g, '')
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hi, I'm interested in ${property.title} (${property.district})`)}`
  const { amount, label } = priceHeadline(property)
  const facts = propertyFacts(property)
  const options = property.variations || []
  const paragraphs = property.description.split(/\n+/).map(s => s.trim()).filter(Boolean)

  return (
    <div className="pt-16 lg:pt-20">
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-sm flex items-center gap-2 text-neutral-500">
        <Link href="/properties" className="hover:text-ink inline-flex items-center gap-1 min-h-11 lg:min-h-0">
          <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          Properties
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/properties?district=${encodeURIComponent(property.district)}`} className="hover:text-ink">{property.district}</Link>
      </nav>

      <PropertyGallery images={property.images} title={property.title} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 grid lg:grid-cols-3 gap-10 lg:gap-14">
        <div className="lg:col-span-2 min-w-0">
          {/* Title block */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-brand-soft text-brand text-xs font-medium">{property.type === 'land' ? 'Land' : 'House'}</span>
            {property.status === 'pending' && <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-medium">Selling fast</span>}
            {property.status === 'sold' && <span className="px-2.5 py-1 rounded-full bg-brand text-white text-xs font-medium">Sold</span>}
          </div>
          <h1 className="text-[28px] leading-tight sm:text-4xl font-semibold text-ink">{property.title}</h1>
          <p className="mt-2 text-neutral-600 flex items-start gap-1.5">
            <HugeiconsIcon icon={Location01Icon} className="w-4 h-4 mt-1 shrink-0" strokeWidth={1.7} aria-hidden="true" />
            {property.address}
          </p>

          {/* Price (phones: here; desktop: in the side card) */}
          <p className="lg:hidden mt-4 text-ink">
            {label && <span className="text-neutral-500 mr-1.5">{label}</span>}
            <span className="text-3xl font-semibold tracking-tight">{amount}</span>
          </p>

          {facts.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Key facts">
              {facts.map(f => <li key={f} className="px-3 py-1.5 rounded-lg bg-brand-soft text-sm text-ink">{f}</li>)}
              <li className="px-3 py-1.5 rounded-lg bg-brand-soft text-sm text-ink">{property.district}</li>
            </ul>
          )}

          {/* Options */}
          {options.length > 0 && (
            <section className="mt-10" aria-labelledby="options-h">
              <h2 id="options-h" className="text-xl font-semibold text-ink mb-4">{property.type === 'land' ? 'Plot sizes' : 'Available options'}</h2>
              <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden">
                {options.map(v => {
                  const sold = v.status === 'sold'
                  const vFacts = [
                    v.bedrooms ? `${v.bedrooms} bed${v.bedrooms > 1 ? 's' : ''}` : '',
                    v.bathrooms ? `${v.bathrooms} bath${v.bathrooms > 1 ? 's' : ''}` : '',
                    v.bq ? `${v.bq} BQ` : '',
                    v.landSize ? `${v.landSize.toLocaleString()} sqm` : '',
                  ].filter(Boolean)
                  return (
                    <li key={v.id} className={`p-4 sm:p-5 flex items-start justify-between gap-4 ${sold ? 'bg-neutral-50' : 'bg-white'}`}>
                      <div className="min-w-0">
                        <p className={`font-medium ${sold ? 'text-neutral-400 line-through' : 'text-ink'}`}>{v.name}</p>
                        {vFacts.length > 0 && <p className="text-sm text-neutral-500 mt-0.5">{vFacts.join(' · ')}</p>}
                        {v.unitsAvailable !== undefined && v.unitsAvailable > 0 && !sold && (
                          <p className="text-xs text-brand font-medium mt-1">{v.unitsAvailable} {v.unitsAvailable === 1 ? 'unit' : 'units'} left</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {sold ? <span className="text-sm text-neutral-500">Sold</span>
                          : v.price ? (<><p className="font-semibold text-ink">{formatPrice(v.price)}</p><p className="text-xs text-neutral-400 hidden sm:block">{formatNaira(v.price)}</p></>)
                          : <span className="text-sm text-neutral-500">Ask for price</span>}
                        {v.status === 'pending' && <p className="text-xs text-amber-700 mt-0.5">Selling fast</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="mt-10" aria-labelledby="about-h">
            <h2 id="about-h" className="text-xl font-semibold text-ink mb-3">About this property</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed text-[15px] sm:text-base">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>

          {property.features.length > 0 && (
            <section className="mt-10" aria-labelledby="features-h">
              <h2 id="features-h" className="text-xl font-semibold text-ink mb-4">Features</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {property.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-ink">
                    <HugeiconsIcon icon={Tick02Icon} className="w-5 h-5 text-brand shrink-0" strokeWidth={1.7} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10" aria-labelledby="loc-h">
            <h2 id="loc-h" className="text-xl font-semibold text-ink mb-4">Location</h2>
            <div className="h-64 sm:h-80 rounded-xl overflow-hidden border border-neutral-200 relative z-0">
              <MapWrapper properties={[property]} selectedProperty={property} interactive={false} />
            </div>
            <p className="mt-2 text-sm text-neutral-500">Pin shows the general area. Ask us for the exact location and directions for an inspection.</p>
          </section>

          {/* Enquiry form (phones) */}
          <section className="mt-10 lg:hidden" aria-labelledby="enq-h">
            <h2 id="enq-h" className="text-xl font-semibold text-ink mb-1">Book an inspection</h2>
            <p className="text-sm text-neutral-500 mb-4">Leave your details and we’ll call you back, usually the same day.</p>
            <ContactForm propertyId={property.id} propertyTitle={property.title} />
          </section>
        </div>

        {/* Desktop side card */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-xl border border-neutral-200 p-6 shadow-sm">
            <p className="text-ink">
              {label && <span className="text-neutral-500 mr-1.5">{label}</span>}
              <span className="text-3xl font-semibold tracking-tight">{amount}</span>
            </p>
            {property.price > 0 && <p className="text-sm text-neutral-400 mt-0.5">{formatNaira(property.price)}</p>}
            <div className="mt-5 grid gap-2.5">
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="h-12 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium transition-colors">
                <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
                Chat on WhatsApp
              </a>
              <a href={`tel:+${phone}`} className="h-12 inline-flex items-center justify-center rounded-lg border border-neutral-300 hover:border-ink text-ink font-medium transition-colors">
                Call {settings.phone_number}
              </a>
            </div>
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <p className="font-medium text-ink mb-3">Book an inspection</p>
              <ContactForm propertyId={property.id} propertyTitle={property.title} />
            </div>
          </div>
        </aside>
      </div>

      {/* Phone action bar: price left, actions right, always in thumb reach */}
      <div data-action-bar className="lg:hidden fixed bottom-0 inset-x-0 z-[1000] bg-white border-t border-neutral-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {label && <p className="text-xs text-neutral-500 leading-none">{label}</p>}
          <p className="text-lg font-semibold text-ink leading-tight truncate">{amount}</p>
        </div>
        <a href={`tel:+${phone}`} className="w-12 h-12 shrink-0 grid place-items-center rounded-lg border border-neutral-300 text-ink" aria-label={`Call ${settings.phone_number}`}>
          <HugeiconsIcon icon={CallIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
        </a>
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="h-12 px-5 shrink-0 inline-flex items-center gap-2 rounded-lg bg-[#25D366] text-white font-medium">
          <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
          WhatsApp
        </a>
      </div>
    </div>
  )
}
