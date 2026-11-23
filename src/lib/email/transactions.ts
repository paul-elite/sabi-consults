// Transaction stage changes. Customer emails for offers, payments and completion
// are only sent from a recorded stage change made by an authorised staff member,
// never automatically from anything a visitor does.
import type { SessionUser } from '@/lib/auth'
import { db } from './config'
import { TRANSACTION_STAGES, stageLabel } from './defaults'
import { emitEvent } from './events'
import { queueEmail } from './send'
import { recordConversion } from './attribution'
import { formatNaira } from '@/lib/format'

export const isAdminOnlyStage = (stage: string) => !!TRANSACTION_STAGES.find(s => s.value === stage)?.adminOnly

export async function changeStage(txId: string, input: {
  stage: string; note?: string | null; amount?: number | null; notifyCustomer?: boolean
}, user: SessionUser): Promise<{ ok: true; notified: boolean } | { ok: false; error: string; status?: number }> {
  const client = db()
  const { data: t } = await client.from('transactions').select('*').eq('id', txId).maybeSingle()
  if (!t) return { ok: false, error: 'Transaction not found', status: 404 }
  if (!TRANSACTION_STAGES.some(s => s.value === input.stage)) return { ok: false, error: 'Unknown stage' }
  if (user.role === 'staff' && t.assigned_to !== user.id) return { ok: false, error: 'This transaction isn’t assigned to you', status: 403 }
  if (isAdminOnlyStage(input.stage) && user.role === 'staff') return { ok: false, error: 'Only an admin can record payments or complete a transaction', status: 403 }
  if (t.stage === 'completed') return { ok: false, error: 'This transaction is already completed' }
  if (input.stage === 'payment_received' && !(input.amount && input.amount > 0)) return { ok: false, error: 'Enter the amount received' }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { stage: input.stage }
  if (input.stage === 'payment_received') patch.amount_received = (Number(t.amount_received) || 0) + Number(input.amount)
  if (input.stage === 'offer_submitted' && input.amount) patch.offer_amount = input.amount
  if (input.stage === 'offer_accepted' && input.amount) patch.agreed_price = input.amount
  if (input.stage === 'completed') patch.completed_at = now
  await client.from('transactions').update(patch).eq('id', txId)

  const { data: ev } = await client.from('transaction_events').insert({
    transaction_id: txId, stage: input.stage, note: input.note || null, amount: input.amount || null,
    customer_notified: !!input.notifyCustomer && input.stage !== 'completed',
    actor_id: user.id === 'env' ? null : user.id, actor_name: user.name,
  }).select('id').single()

  const base = { transaction_id: txId, lead_id: t.lead_id, contact_id: t.contact_id, property_id: t.property_id }
  const vars = { note: input.note || '', amount: input.amount ? formatNaira(input.amount) : '', transaction_stage_label: stageLabel(input.stage) }
  await emitEvent('transaction.stage_changed', { ...base, from: t.stage, to: input.stage, vars, subject_key: `tx:${txId}:${ev?.id}` }, `transaction.stage_changed:${txId}:${ev?.id}`)
  if (input.stage === 'offer_submitted') await emitEvent('offer.submitted', { ...base, subject_key: `offer:${txId}` }, `offer.submitted:${txId}:${ev?.id}`)
  if (input.stage === 'offer_accepted') await emitEvent('offer.accepted', { ...base, subject_key: `offer:${txId}` }, `offer.accepted:${txId}`)
  if (input.stage === 'payment_received') await emitEvent('payment.confirmed', { ...base, amount: input.amount, subject_key: `pay:${ev?.id}` }, `payment.confirmed:${ev?.id}`)

  // Move the lead along the pipeline
  if (t.lead_id) {
    const leadStatus = input.stage === 'completed' ? 'converted'
      : ['offer_submitted', 'offer_accepted', 'payment_instructions', 'payment_received', 'documentation_requested'].includes(input.stage) ? 'offer_submitted'
        : input.stage === 'negotiating' ? 'negotiating' : null
    if (leadStatus) {
      const { data: l } = await client.from('leads').select('status').eq('id', t.lead_id).maybeSingle()
      if (l && l.status !== leadStatus && l.status !== 'converted') {
        await client.from('leads').update({ status: leadStatus }).eq('id', t.lead_id)
        await client.from('lead_activities').insert({ lead_id: t.lead_id, type: 'status_change', from_value: l.status, to_value: leadStatus, actor_name: `Transaction ${t.reference}` })
      }
    }
  }

  if (input.stage === 'completed') {
    await emitEvent('transaction.completed', { ...base, vars, subject_key: `tx-complete:${txId}` }, `transaction.completed:${txId}`)
    if (t.contact_id) {
      await client.from('contacts').update({ customer_since: now.slice(0, 10) }).eq('id', t.contact_id).is('customer_since', null)
    }
    await recordConversion({ type: 'transaction', entityId: txId, contactId: t.contact_id, leadId: t.lead_id, propertyId: t.property_id, value: Number(t.agreed_price) || null, useCookie: false })
    if (t.property_id) {
      // Completed sale: mark the listing sold, which also stops promoting it
      const { data: p } = await client.from('properties').select('status').eq('id', t.property_id).maybeSingle()
      if (p?.status === 'available' || p?.status === 'pending') {
        await client.from('properties').update({ status: 'sold' }).eq('id', t.property_id)
        await emitEvent('property.unavailable', { property_id: t.property_id, status: 'sold', subject_key: `unavailable:${t.property_id}` }, `property.unavailable:${t.property_id}:${now}`)
      }
    }
    return { ok: true, notified: true } // the post-transaction workflow sends the thank-you
  }

  let notified = false
  const template = TRANSACTION_STAGES.find(s => s.value === input.stage)?.template
  if (input.notifyCustomer && template && t.contact_id) {
    const { data: c } = await client.from('contacts').select('id, email, name').eq('id', t.contact_id).maybeSingle()
    if (c) {
      await queueEmail({
        to: c.email, toName: c.name, contactId: c.id, templateKey: template, category: 'transactional',
        context: { transaction_id: txId, lead_id: t.lead_id, property_id: t.property_id, vars },
        idempotencyKey: `tx:${txId}:${ev?.id}`, createdBy: user.name,
      })
      notified = true
    }
  }
  return { ok: true, notified }
}
