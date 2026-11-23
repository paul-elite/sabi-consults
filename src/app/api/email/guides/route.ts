import { NextRequest, NextResponse } from 'next/server'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail, siteUrl } from '@/lib/email/config'
import { upsertContact } from '@/lib/email/contacts'
import { attributionFrom, handleMarketingOptIn } from '@/lib/email/intake'
import { emitEvent } from '@/lib/email/events'
import { queueEmail } from '@/lib/email/send'
import { kickWorker } from '@/lib/email/worker'
import { guideTag } from '@/lib/email/forms'

// Public list of guides that have a file attached
export async function GET() {
  const { data } = await db().from('lead_magnets').select('slug, title, description, topic')
    .eq('active', true).not('file_url', 'is', null).order('sort_order')
  return NextResponse.json(data || [])
}

// Request a guide: we record the person, email them the link and show it straight away
export async function POST(request: NextRequest) {
  const raw = await readJson(request, 8 * 1024)
  if (raw instanceof NextResponse) return raw
  if (raw.website) return NextResponse.json({ ok: true })
  const key = `guide:${clientIp(request)}`
  if (isLimited(key, 10, 60 * 60_000)) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  const email = cleanText(raw.email, 200).toLowerCase()
  if (!isEmail(email)) return NextResponse.json({ error: 'Enter an email like name@example.com' }, { status: 400 })
  const slug = cleanText(raw.slug, 80)
  const client = db()
  const { data: guide } = await client.from('lead_magnets').select('*').eq('slug', slug).eq('active', true).maybeSingle()
  if (!guide?.file_url) return NextResponse.json({ error: 'That guide isn’t available' }, { status: 404 })
  rateLimit(key, 10, 60 * 60_000)

  const attr = attributionFrom(raw, 'guide')
  const contact = await upsertContact({
    email, name: cleanText(raw.name, 120) || null, source: attr.source === 'guide' ? 'guide' : attr.source, sourceDetail: slug,
    interests: guide.topic ? { topics: [guide.topic] } : undefined, tags: [`guide:${slug}`],
    utm: { utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign },
  })
  const downloadUrl = `${siteUrl()}/api/email/guides/download?g=${encodeURIComponent(slug)}&c=${contact.id}&s=${guideTag(slug, contact.id)}`
  await queueEmail({
    to: email, toName: contact.name, contactId: contact.id, templateKey: 'guide_delivery', category: 'transactional',
    context: { vars: { guide_title: guide.title, guide_url: downloadUrl } }, idempotencyKey: `guide:${slug}:${contact.id}`,
  })
  await client.from('lead_magnets').update({ request_count: (guide.request_count || 0) + 1 }).eq('id', guide.id)
  await emitEvent('guide.requested', { contact_id: contact.id, lead_id: contact.lead_id, guide: slug, subject_key: `guide:${slug}:${contact.id}` }, `guide.requested:${slug}:${contact.id}`)
  // Nurturing only with explicit consent
  let subscription: string | null = null
  if (raw.consent === true) subscription = await handleMarketingOptIn(contact, request, `guide:${slug}`, 'guides, property updates and news')
  kickWorker('guide')
  return NextResponse.json({ ok: true, downloadUrl, subscription })
}
