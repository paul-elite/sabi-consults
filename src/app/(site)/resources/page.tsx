import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resources & Forms',
  description: 'Download essential real estate forms, checklists, and guides for property transactions in Abuja.',
}

const DOCUMENT_CATEGORIES = [
  {
    title: 'Property Purchase',
    description: 'Essential documents for buying land or property in Abuja',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    documents: [
      {
        name: 'Property Inspection Checklist',
        description: 'A comprehensive checklist to evaluate any property before purchase',
        format: 'PDF',
        size: '245 KB',
        href: '/forms/property-inspection-checklist.pdf',
      },
      {
        name: 'Offer Letter Template',
        description: 'Standard offer letter template for property acquisition',
        format: 'DOCX',
        size: '52 KB',
        href: '/forms/offer-letter-template.docx',
      },
      {
        name: 'Due Diligence Checklist',
        description: 'Legal and documentation checklist for property verification',
        format: 'PDF',
        size: '189 KB',
        href: '/forms/due-diligence-checklist.pdf',
      },
      {
        name: 'Payment Schedule Template',
        description: 'Flexible payment plan template for property installments',
        format: 'XLSX',
        size: '38 KB',
        href: '/forms/payment-schedule-template.xlsx',
      },
    ],
  },
  {
    title: 'Land Documentation',
    description: 'Forms and guides for land title verification and documentation',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    documents: [
      {
        name: 'C of O Verification Guide',
        description: 'How to verify a Certificate of Occupancy at the Land Registry',
        format: 'PDF',
        size: '312 KB',
        href: '/forms/cof-o-verification-guide.pdf',
      },
      {
        name: 'Survey Plan Requirements',
        description: 'Checklist of requirements for obtaining a survey plan',
        format: 'PDF',
        size: '156 KB',
        href: '/forms/survey-plan-requirements.pdf',
      },
      {
        name: 'Deed of Assignment Template',
        description: 'Standard deed of assignment template for property transfer',
        format: 'DOCX',
        size: '78 KB',
        href: '/forms/deed-of-assignment-template.docx',
      },
      {
        name: 'Land Title Documents Checklist',
        description: 'Complete list of documents required for land title perfection',
        format: 'PDF',
        size: '198 KB',
        href: '/forms/land-title-documents-checklist.pdf',
      },
    ],
  },
  {
    title: 'Property Management',
    description: 'Templates for property owners and landlords',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    documents: [
      {
        name: 'Tenancy Agreement Template',
        description: 'Standard residential tenancy agreement for Abuja properties',
        format: 'DOCX',
        size: '89 KB',
        href: '/forms/tenancy-agreement-template.docx',
      },
      {
        name: 'Property Handover Checklist',
        description: 'Checklist for property handover between parties',
        format: 'PDF',
        size: '134 KB',
        href: '/forms/property-handover-checklist.pdf',
      },
      {
        name: 'Rent Receipt Template',
        description: 'Professional rent receipt template for landlords',
        format: 'PDF',
        size: '45 KB',
        href: '/forms/rent-receipt-template.pdf',
      },
      {
        name: 'Property Inventory Form',
        description: 'Detailed inventory form for furnished properties',
        format: 'XLSX',
        size: '62 KB',
        href: '/forms/property-inventory-form.xlsx',
      },
    ],
  },
  {
    title: 'Guides & Resources',
    description: 'Educational resources for property buyers and investors',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    documents: [
      {
        name: 'First-Time Buyer Guide',
        description: 'Complete guide for first-time property buyers in Abuja',
        format: 'PDF',
        size: '1.2 MB',
        href: '/forms/first-time-buyer-guide.pdf',
      },
      {
        name: 'Abuja Districts Overview',
        description: 'Comprehensive guide to all Abuja districts and property values',
        format: 'PDF',
        size: '856 KB',
        href: '/forms/abuja-districts-overview.pdf',
      },
      {
        name: 'Property Investment Calculator',
        description: 'Excel spreadsheet for calculating ROI on property investments',
        format: 'XLSX',
        size: '124 KB',
        href: '/forms/property-investment-calculator.xlsx',
      },
      {
        name: 'Diaspora Buyer Checklist',
        description: 'Special checklist for overseas buyers investing in Abuja',
        format: 'PDF',
        size: '267 KB',
        href: '/forms/diaspora-buyer-checklist.pdf',
      },
    ],
  },
]

const FORMAT_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: 'bg-red-50', text: 'text-red-700' },
  DOCX: { bg: 'bg-blue-50', text: 'text-blue-700' },
  XLSX: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

function DocumentCard({ doc }: { doc: typeof DOCUMENT_CATEGORIES[0]['documents'][0] }) {
  const colors = FORMAT_COLORS[doc.format] || { bg: 'bg-neutral-100', text: 'text-neutral-700' }

  return (
    <a
      href={doc.href}
      download
      className="group flex items-start gap-4 p-4 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
        <span className={`text-xs font-semibold ${colors.text}`}>{doc.format}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-ink group-hover:text-brand transition-colors text-[15px]">
          {doc.name}
        </h4>
        <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{doc.description}</p>
        <p className="text-xs text-neutral-400 mt-1.5">{doc.size}</p>
      </div>
      <div className="flex-shrink-0 text-neutral-400 group-hover:text-brand transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
    </a>
  )
}

export default function ResourcesPage() {
  return (
    <div className="min-h-screen pt-16 lg:pt-20 bg-neutral-50">
      {/* Header */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-medium text-ink mb-3">Resources & Forms</h1>
          <p className="text-lg text-neutral-600 max-w-2xl">
            Download essential documents, templates, and guides to help you navigate property transactions in Abuja with confidence.
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-semibold text-brand">16+</p>
              <p className="text-sm text-neutral-500 mt-1">Documents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-brand">4</p>
              <p className="text-sm text-neutral-500 mt-1">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-brand">Free</p>
              <p className="text-sm text-neutral-500 mt-1">Downloads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-brand">2024</p>
              <p className="text-sm text-neutral-500 mt-1">Updated</p>
            </div>
          </div>
        </div>
      </section>

      {/* Document Categories */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="space-y-12">
          {DOCUMENT_CATEGORIES.map((category) => (
            <div key={category.title}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  {category.icon}
                </div>
                <div>
                  <h2 className="text-xl font-medium text-ink">{category.title}</h2>
                  <p className="text-sm text-neutral-500">{category.description}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {category.documents.map((doc) => (
                  <DocumentCard key={doc.name} doc={doc} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Help Section */}
      <section className="bg-white border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="bg-surface rounded-xl p-8 sm:p-10 text-center">
            <h2 className="text-2xl font-medium text-ink mb-3">Need a Custom Document?</h2>
            <p className="text-neutral-600 mb-6 max-w-xl mx-auto">
              Our team can help prepare customized documents for your specific property transaction needs in Abuja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="btn btn-lg btn-brand"
              >
                Contact Us
              </Link>
              <a
                href="https://wa.me/2349112122288"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-lg btn-outline"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
