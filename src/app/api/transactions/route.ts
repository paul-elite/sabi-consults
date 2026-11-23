import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isUuid, makeReference } from '@/lib/email/config'
import { emitEvent } from '@/lib/email/events'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

export async function GET(request: NextRequest) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const p = request.nextUrl.searchParams
  let q = db().from('transactions')
    .select('*, property:properties(id, title, district), lead:leads(id, name, phone, email), assignee:admin_users!transactions_assigned_to_fkey(id, name)')
    .order('updated_at', { ascending: false }).limit(300)
  if (p.get('stage')) q = q.eq('stage', String(p.get('stage')))
  if (p.get('leadId') && isUuid(p.get('leadId'))) q = q.eq('lead_id', String(p.get('leadId')))
  if (auth.role === 'staff') q = q.eq('assigned_to', auth.id)
  const { data, error } = await q
  if (error) return bad(error.message, 500)
  return NextResponse.json(data || [])
}

// Open a transaction for a lead (usually after an inspection)
export async function POST(request: NextRequest) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const leadId = String(raw.leadId || '')
  if (!isUuid(leadId)) return bad('Choose a lead')
  const client = db()
  const { data: lead } = await client.from('leads').select('id, assigned_to, most_viewed_property_id').eq('id', leadId).maybeSingle()
  if (!lead) return bad('Lead not found', 404)
  if (auth.role === 'staff' && lead.assigned_to !== auth.id) return bad('This lead isn’t assigned to you', 403)
  const propertyId = isUuid(raw.propertyId) ? String(raw.propertyId) : lead.most_viewed_property_id
  const { data: contact } = await client.from('contacts').select('id').eq('lead_id', leadId).limit(1).maybeSingle()
  const offer = Number(raw.offerAmount) > 0 ? Math.round(Number(raw.offerAmount)) : null
  const { data, error } = await client.from('transactions').insert({
    reference: makeReference('TX'), lead_id: leadId, contact_id: contact?.id || null, property_id: propertyId || null,
    stage: 'interest', offer_amount: offer, assigned_to: lead.assigned_to || (auth.id === 'env' ? null : auth.id),
    notes: cleanText(raw.notes, 3000) || null, created_by: auth.name,
  }).select().single()
  if (error) return bad(error.message, 500)
  await client.from('transaction_events').insert({ transaction_id: data.id, stage: 'interest', note: 'Transaction opened', actor_id: auth.id === 'env' ? null : auth.id, actor_name: auth.name })
  await emitEvent('transaction.created', { transaction_id: data.id, lead_id: leadId, contact_id: contact?.id || null, property_id: propertyId, subject_key: `tx:${data.id}` }, `transaction.created:${data.id}`)
  const { data: l } = await client.from('leads').select('status').eq('id', leadId).maybeSingle()
  if (l && ['new', 'contacted', 'qualified', 'interested', 'inspection_scheduled', 'inspected'].includes(l.status)) {
    await client.from('leads').update({ status: 'negotiating' }).eq('id', leadId)
    await client.from('lead_activities').insert({ lead_id: leadId, type: 'status_change', from_value: l.status, to_value: 'negotiating', actor_name: auth.name })
  }
  kickWorker('transaction')
  return NextResponse.json(data, { status: 201 })
}
