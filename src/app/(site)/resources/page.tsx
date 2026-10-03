
import { HugeiconsIcon } from '@hugeicons/react'
import { BookOpen01Icon, Building03Icon, Download01Icon, File01Icon, MapsIcon, WhatsappIcon } from '@hugeicons/core-free-icons'
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
      <HugeiconsIcon icon={File01Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
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
      <HugeiconsIcon icon={MapsIcon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
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
      <HugeiconsIcon icon={Building03Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
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
      <HugeiconsIcon icon={BookOpen01Icon} className="w-6 h-6" strokeWidth={1.7} aria-hidden="true" />
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
        <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
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
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink mb-3">Resources & Forms</h1>
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
                  <h2 className="text-xl font-semibold text-ink">{category.title}</h2>
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
          <div className="bg-brand-soft rounded-xl p-8 sm:p-10 text-center">
            <h2 className="text-2xl font-semibold text-ink mb-3">Need a Custom Document?</h2>
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
                <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
