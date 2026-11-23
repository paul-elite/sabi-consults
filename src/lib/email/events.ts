// The event bus. Business code records what happened (an enquiry, a booking, a
// price change) and returns; communication is decided later by the worker.
// Separating the two means new channels (SMS, WhatsApp) can subscribe to the
// same events without touching the business logic.
import { db } from './config'

export type AppEventType =
  | 'contact.created' | 'subscriber.created' | 'subscriber.confirmed' | 'subscriber.unsubscribed'
  | 'lead.created' | 'lead.assigned' | 'lead.status_changed' | 'lead.replied'
  | 'inquiry.created' | 'guide.requested'
  | 'property.published' | 'property.updated' | 'property.price_changed' | 'property.unavailable' | 'property.saved'
  | 'inspection.requested' | 'inspection.booked' | 'inspection.rescheduled' | 'inspection.cancelled'
  | 'inspection.completed' | 'inspection.missed' | 'inspection.no_show'
  | 'transaction.created' | 'transaction.stage_changed' | 'offer.submitted' | 'offer.accepted'
  | 'payment.confirmed' | 'transaction.completed'
  | 'referral.created' | 'referral.converted'

export interface EventPayload {
  contact_id?: string | null
  lead_id?: string | null
  property_id?: string | null
  inquiry_id?: string | null
  viewing_id?: string | null
  transaction_id?: string | null
  referral_id?: string | null
  subject_key?: string
  [key: string]: unknown
}

/**
 * Records an event once. The dedupe key identifies the real-world occurrence
 * (e.g. "inquiry.created:<id>"), so emitting it twice is harmless.
 */
export async function emitEvent(type: AppEventType, payload: EventPayload, dedupeKey?: string): Promise<string | null> {
  const key = dedupeKey || `${type}:${payload.subject_key || crypto.randomUUID()}`
  const { data, error } = await db().from('app_events').insert({
    type, dedupe_key: key.slice(0, 300),
    contact_id: payload.contact_id || null, lead_id: payload.lead_id || null, payload,
  }).select('id').single()
  if (error) {
    if (error.code === '23505') return null // already recorded
    console.error('emitEvent failed', type, error.message)
    return null
  }
  return data.id
}

export interface EventStats { processed: number; failed: number; enrolled: number; exited: number }

export async function processEvents(deadline: number, limit = 50): Promise<EventStats> {
  const stats: EventStats = { processed: 0, failed: 0, enrolled: 0, exited: 0 }
  const client = db()
  const { data, error } = await client.rpc('claim_app_events', { p_limit: limit })
  if (error) throw new Error(`claim_app_events: ${error.message}`)
  const { handleEventForAutomations } = await import('./automations')
  const { handleDomainEvent } = await import('./handlers')
  for (const ev of (data || []) as { id: string; type: AppEventType; payload: EventPayload; attempts: number; created_at: string }[]) {
    if (Date.now() > deadline) {
      await client.from('app_events').update({ status: 'pending', locked_until: null, attempts: Math.max(0, ev.attempts - 1) }).eq('id', ev.id)
      continue
    }
    try {
      await handleDomainEvent(ev)
      const r = await handleEventForAutomations(ev)
      stats.enrolled += r.enrolled
      stats.exited += r.exited
      await client.from('app_events').update({ status: 'processed', processed_at: new Date().toISOString(), error: null, locked_until: null }).eq('id', ev.id)
      stats.processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('event failed', ev.type, msg)
      await client.from('app_events').update({ status: ev.attempts >= 5 ? 'failed' : 'pending', error: msg, locked_until: null }).eq('id', ev.id)
      stats.failed++
    }
  }
  return stats
}
