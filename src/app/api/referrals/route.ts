import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail, isUuid } from '@/lib/email/config'
import { emitEvent } from '@/lib/email/events'
import { identify } from '@/lib/email/intake'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  let q = db().from('referrals').select('*, referrer:contacts!referrals_referrer_contact_id_fkey(id, name, email), referred_lead:leads(id, name, status)').order('created_at', { ascending: false }).limit(300)
  const c = request.nextUrl.searchParams.get('contactId')
  if (isUuid(c)) q = q.eq('referrer_contact_id', c)
  const { data, error } = await q
  if (error) return bad(error.message, 500)
  return NextResponse.json(data || [])
}

// Record a referral (usually from a customer's reply). Creates a lead for the person referred.
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const referrerId = String(raw.referrerContactId || '')
  if (!isUuid(referrerId)) return bad('Choose who made the referral')
  const name = cleanText(raw.name, 120)
  if (!name) return bad('Enter the referred person’s name')
  const email = cleanText(raw.email, 200).toLowerCase() || null
  if (email && !isEmail(email)) return bad('Enter a valid email')
  const phone = cleanText(raw.phone, 40) || null
  if (!email && !phone) return bad('Enter an email or phone number for the person referred')
  const client = db()
  const { data: referrer } = await client.from('contacts').select('id, name, lead_id').eq('id', referrerId).maybeSingle()
  if (!referrer) return bad('Referrer not found', 404)

  const who = await identify({ name, email, phone }, { source: 'referral', utm_source: 'referral' }, { contactSource: 'referral', sourceDetail: referrerId })
  const { data, error } = await client.from('referrals').insert({
    referrer_contact_id: referrerId, referred_name: name, referred_email: email, referred_phone: phone,
    referred_lead_id: who.leadId, notes: cleanText(raw.notes, 2000) || null,
  }).select().single()
  if (error) return bad(error.message, 500)
  if (who.leadId) await client.from('leads').update({ notes: `Referred by ${referrer.name || 'a customer'}` }).eq('id', who.leadId).is('notes', null)
  await emitEvent('referral.created', {
    referral_id: data.id, contact_id: referrerId, lead_id: referrer.lead_id,
    vars: { referral_name: name, lead_name: referrer.name || '' }, subject_key: `referral:${data.id}`,
  }, `referral.created:${data.id}`)
  kickWorker('referral')
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const id = String(raw.id || '')
  const status = String(raw.status || '')
  if (!isUuid(id) || !['new', 'contacted', 'converted', 'rewarded', 'invalid'].includes(status)) return bad('Invalid update')
  const client = db()
  const { data: before } = await client.from('referrals').select('*').eq('id', id).maybeSingle()
  if (!before) return bad('Not found', 404)
  const { data, error } = await client.from('referrals').update({ status, notes: raw.notes !== undefined ? cleanText(raw.notes, 2000) : before.notes }).eq('id', id).select().single()
  if (error) return bad(error.message, 500)
  if (status === 'converted' && before.status !== 'converted') {
    await emitEvent('referral.converted', {
      referral_id: id, contact_id: before.referrer_contact_id, vars: { referral_name: before.referred_name, referral_status: 'converted' }, subject_key: `referral-converted:${id}`,
    }, `referral.converted:${id}`)
    kickWorker('referral')
  }
  return NextResponse.json(data)
}
