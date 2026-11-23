import { NextRequest, NextResponse } from 'next/server'
import { clientIp, isLimited, rateLimit, readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail } from '@/lib/email/config'
import { upsertContact } from '@/lib/email/contacts'
import { attributionFrom, handleMarketingOptIn } from '@/lib/email/intake'
import { kickWorker } from '@/lib/email/worker'
import { cleanInterests } from '@/lib/email/forms'

// Newsletter sign-up (footer, newsletter page, contextual prompts)
export async function POST(request: NextRequest) {
  const raw = await readJson(request, 8 * 1024)
  if (raw instanceof NextResponse) return raw
  if (raw.website) return NextResponse.json({ status: 'pending' })
  const key = `subscribe:${clientIp(request)}`
  if (isLimited(key, 6, 60 * 60_000)) return NextResponse.json({ error: 'Too many sign-ups from here. Please try again later.' }, { status: 429 })

  const email = cleanText(raw.email, 200).toLowerCase()
  if (!isEmail(email)) return NextResponse.json({ error: 'Enter an email like name@example.com' }, { status: 400 })
  if (raw.consent !== true) return NextResponse.json({ error: 'Please tick the box to agree to receive emails' }, { status: 400 })
  rateLimit(key, 6, 60 * 60_000)

  const source = cleanText(raw.source, 40) || 'newsletter'
  const attr = attributionFrom(raw, 'newsletter')
  const interests = cleanInterests(raw.interests)
  const frequency = ['instant', 'weekly', 'important_only'].includes(String(raw.frequency)) ? String(raw.frequency) : null
  try {
    const contact = await upsertContact({
      email, name: cleanText(raw.name, 120) || null, source: attr.source === 'website' ? 'newsletter' : attr.source,
      sourceDetail: source, interests, utm: { utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign },
    })
    if (frequency) await db().from('contacts').update({ frequency }).eq('id', contact.id)
    const status = await handleMarketingOptIn(contact, request, source, 'property updates and news')
    kickWorker('subscribe')
    return NextResponse.json({ status })
  } catch (err) {
    console.error('subscribe failed', err)
    return NextResponse.json({ error: 'We couldn’t sign you up just now. Please try again.' }, { status: 500 })
  }
}
