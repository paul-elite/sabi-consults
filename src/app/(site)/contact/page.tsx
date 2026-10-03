
import { HugeiconsIcon } from '@hugeicons/react'
import { CallIcon, InstagramIcon, Location01Icon, Mail01Icon, WhatsappIcon } from '@hugeicons/core-free-icons'
import { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import ContactForm from '@/components/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with us for premium real estate services in Abuja, Nigeria.',
}

export default async function ContactPage() {
  const settings = await getSettings()
  const digits = settings.whatsapp_number.replace(/\D/g, '')
  return (
    <div className="pt-16 lg:pt-20">
      {/* Hero Section */}
      <section className="py-24 bg-brand-soft">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-brand uppercase tracking-wider mb-4">
              Contact Us
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold text-ink mb-6">
              Let&apos;s Start a Conversation
            </h1>
            <p className="text-xl text-neutral-600 leading-relaxed">
              Whether you&apos;re ready to buy, sell, or simply want to explore your options,
              our team is here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-semibold text-ink mb-8">
                Get in Touch
              </h2>

              <div className="space-y-8">
                {/* Office Address */}
                <div className="flex gap-4">
                  <div className="rounded-lg w-12 h-12 bg-brand-soft flex items-center justify-center flex-shrink-0">
                    <HugeiconsIcon icon={Location01Icon} className="w-5 h-5 text-brand" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Office Location</h3>
                    <p className="text-neutral-600">
                      {settings.address}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4">
                  <div className="rounded-lg w-12 h-12 bg-brand-soft flex items-center justify-center flex-shrink-0">
                    <HugeiconsIcon icon={Mail01Icon} className="w-5 h-5 text-brand" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Email Us</h3>
                    <a href={`mailto:${settings.email}`} className="text-neutral-600 hover:text-brand transition-colors">
                      {settings.email}
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex gap-4">
                  <div className="rounded-lg w-12 h-12 bg-brand-soft flex items-center justify-center flex-shrink-0">
                    <HugeiconsIcon icon={CallIcon} className="w-5 h-5 text-brand" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Call Us</h3>
                    <a href={`tel:+${digits}`} className="text-neutral-600 hover:text-brand transition-colors">
                      {settings.phone_number}
                    </a>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex gap-4">
                  <div className="rounded-lg w-12 h-12 bg-[#25D366] flex items-center justify-center flex-shrink-0">
                    <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5 text-white" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">WhatsApp</h3>
                    <a
                      href={`https://wa.me/${digits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-600 hover:text-brand transition-colors"
                    >
                      Chat with us
                    </a>
                  </div>
                </div>

                {/* Instagram */}
                <div className="flex gap-4">
                  <div className="rounded-lg w-12 h-12 bg-brand-soft flex items-center justify-center flex-shrink-0">
                    <HugeiconsIcon icon={InstagramIcon} className="w-5 h-5 text-brand" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Instagram</h3>
                    <a
                      href={`https://instagram.com/${settings.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-600 hover:text-brand transition-colors"
                    >
                      @{settings.instagram_handle}
                    </a>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="mt-12 pt-8 border-t border-neutral-200">
                <h3 className="font-semibold text-ink mb-4">Operating Hours</h3>
                <div className="space-y-2 text-neutral-600">
                  <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                  <p>Saturday: 10:00 AM - 4:00 PM</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="rounded-xl bg-brand-soft p-8 lg:p-12">
              <h2 className="text-2xl font-semibold text-ink mb-2">
                Send Us a Message
              </h2>
              <p className="text-neutral-600 mb-8">
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${digits}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
        aria-label="Chat on WhatsApp"
      >
        <HugeiconsIcon icon={WhatsappIcon} className="w-7 h-7 text-white" strokeWidth={1.7} aria-hidden="true" />
      </a>
    </div>
  )
}
