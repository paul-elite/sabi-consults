// Event handlers that need logic beyond a fixed workflow: inspection reminders
// timed from the booking, and property alerts that match listings to people.
import { db, getEmailSettings } from './config'
import type { AppEventType, EventPayload } from './events'
import { loadProperty, propertyMatches } from './context'
import { queueEmail } from './send'
import { formatNaira } from '@/lib/format'
import type { Interests } from './contacts'

export async function handleDomainEvent(ev: { id: string; type: AppEventType; payload: EventPayload }) {
  const p = ev.payload || {}
  switch (ev.type) {
    case 'inspection.booked':
    case 'inspection.rescheduled':
      await scheduleInspectionReminders(String(p.viewing_id))
      break
    case 'inspection.cancelled':
    case 'inspection.completed':
    case 'inspection.no_show':
      await cancelInspectionReminders(String(p.viewing_id), ev.type)
      break
    case 'property.published':
      await announceProperty(String(p.property_id))
      break
    case 'property.price_changed':
      await notifyPriceChange(String(p.property_id), Number(p.old_price), Number(p.new_price))
      break
    case 'property.unavailable':
      await notifyUnavailable(String(p.property_id), String(p.status || 'unavailable'))
      break
  }
  // Keep the lead score current with every meaningful event
  if (p.lead_id) {
    const { error } = await db().rpc('calculate_lead_score', { p_lead_id: p.lead_id })
    if (error) console.error('calculate_lead_score', error.message)
  }
}

/* ------------------------------------------------------------- inspections */

async function cancelInspectionReminders(viewingId: string, why: string) {
  await db().from('email_messages').update({ status: 'cancelled', status_reason: `Inspection ${why.split('.')[1]}` })
    .eq('viewing_id', viewingId).eq('status', 'queued').in('template_key', ['inspection_reminder', 'internal_inspection'])
    .gt('send_after', new Date().toISOString())
}

export async function scheduleInspectionReminders(viewingId: string) {
  const client = db()
  const { data: v } = await client.from('viewing_requests').select('*').eq('id', viewingId).maybeSingle()
  if (!v || v.status !== 'confirmed' || !v.confirmed_datetime) return
  // Old reminders were for a different time
  await client.from('email_messages').update({ status: 'cancelled', status_reason: 'Inspection rescheduled' })
    .eq('viewing_id', viewingId).eq('status', 'queued').eq('template_key', 'inspection_reminder')
    .neq('context->>expected_datetime', new Date(v.confirmed_datetime).toISOString())
  const settings = await getEmailSettings()
  const at = new Date(v.confirmed_datetime)
  const iso = at.toISOString()
  const now = Date.now()
  const plans: { hours: number; label: string; when: string }[] = [
    { hours: settings.reminderHours, label: 'early', when: settings.reminderHours >= 20 && settings.reminderHours <= 30 ? 'tomorrow' : `in ${settings.reminderHours} hours` },
    { hours: settings.dayOfHours, label: 'dayof', when: 'today' },
  ]
  const email = v.email || (v.contact_id ? (await client.from('contacts').select('email').eq('id', v.contact_id).maybeSingle()).data?.email : null)
  for (const plan of plans) {
    const sendAt = new Date(at.getTime() - plan.hours * 3600_000)
    if (sendAt.getTime() < now - 5 * 60_000) continue // too late for this reminder
    const ctx = { viewing_id: viewingId, lead_id: v.lead_id, property_id: v.property_id, expected_datetime: iso, vars: { when: plan.when } }
    if (email) {
      await queueEmail({
        to: email, toName: v.name, contactId: v.contact_id, templateKey: 'inspection_reminder', category: 'transactional',
        context: ctx, idempotencyKey: `reminder:${viewingId}:${iso}:${plan.label}`, sendAfter: sendAt, expiresAt: at,
      })
    }
  }
  // Heads-up to the assigned agent the day before
  if (v.assigned_to) {
    const { data: agent } = await client.from('admin_users').select('email, name').eq('id', v.assigned_to).maybeSingle()
    const sendAt = new Date(at.getTime() - settings.reminderHours * 3600_000)
    if (agent?.email && sendAt.getTime() > now - 5 * 60_000) {
      await queueEmail({
        to: agent.email, toName: agent.name, templateKey: 'internal_inspection', category: 'internal',
        context: { viewing_id: viewingId, lead_id: v.lead_id, property_id: v.property_id, expected_datetime: iso, admin_path: '/admin/inspections', vars: { inspection_event: 'coming up' } },
        idempotencyKey: `agent-reminder:${viewingId}:${iso}`, sendAfter: sendAt, expiresAt: at,
      })
    }
  }
}

/* --------------------------------------------------------------- property */

async function contactsByIds(ids: string[]) {
  if (!ids.length) return []
  const { data } = await db().from('contacts').select('id, email, name, marketing_status, frequency, interests, suppressed, archived_at').in('id', ids)
  return data || []
}

/** New listing: people with a matching alert, plus subscribers whose stated interests match. Never everyone. */
export async function announceProperty(propertyId: string) {
  const client = db()
  const prop = await loadProperty(propertyId)
  if (!prop || prop.status !== 'available') return
  const recipients = new Map<string, { id: string; email: string; name: string | null }>()

  const { data: alerts } = await client.from('property_alerts').select('id, contact_id, criteria').eq('active', true).is('property_id', null)
  const alertMatches = (alerts || []).filter(a => propertyMatches(prop, a.criteria as Interests))
  for (const c of await contactsByIds(alertMatches.map(a => a.contact_id))) {
    if (c.marketing_status === 'subscribed' && !c.suppressed && !c.archived_at && c.frequency !== 'weekly') recipients.set(c.id, c)
  }
  // Subscribers who told us what they want (type or area) and get instant updates
  const { data: subs } = await client.from('contacts').select('id, email, name, interests, frequency')
    .eq('marketing_status', 'subscribed').eq('suppressed', false).is('archived_at', null).eq('frequency', 'instant').limit(5000)
  for (const c of subs || []) {
    const i = (c.interests || {}) as Interests
    const stated = (i.types?.length || 0) + (i.districts?.length || 0) > 0 || !!i.maxBudget
    if (stated && propertyMatches(prop, i)) recipients.set(c.id, c)
  }
  for (const c of recipients.values()) {
    await queueEmail({
      to: c.email, toName: c.name, contactId: c.id, templateKey: 'new_property_announcement', category: 'marketing',
      context: { property_id: propertyId, promotes_property: true }, idempotencyKey: `newprop:${propertyId}:${c.id}`,
    })
  }
  if (alertMatches.length) await client.from('property_alerts').update({ last_sent_at: new Date().toISOString() }).in('id', alertMatches.map(a => a.id))
}

/** People who watch the property (asked for updates) or enquired about it. */
async function interestedContacts(propertyId: string) {
  const client = db()
  const watchers = new Set<string>()
  const { data: watches } = await client.from('property_alerts').select('contact_id').eq('property_id', propertyId).eq('active', true)
  for (const w of watches || []) watchers.add(w.contact_id)
  const enquirers = new Set<string>()
  const { data: interests } = await client.from('lead_property_interests').select('lead_id').eq('property_id', propertyId)
  const leadIds = (interests || []).map(i => i.lead_id)
  const { data: inq } = await client.from('inquiries').select('contact_id').eq('property_id', propertyId).not('contact_id', 'is', null)
  for (const q of inq || []) enquirers.add(q.contact_id)
  if (leadIds.length) {
    const { data: cs } = await client.from('contacts').select('id').in('lead_id', leadIds)
    for (const c of cs || []) enquirers.add(c.id)
  }
  for (const w of watchers) enquirers.delete(w)
  return { watchers: [...watchers], enquirers: [...enquirers] }
}

export async function notifyPriceChange(propertyId: string, oldPrice: number, newPrice: number) {
  if (!newPrice || oldPrice === newPrice) return
  const { watchers, enquirers } = await interestedContacts(propertyId)
  const vars = { old_price: oldPrice > 0 ? formatNaira(oldPrice) : 'Price on request', new_price: formatNaira(newPrice) }
  // Watchers asked for updates on this listing; enquirers only hear about it if they agreed to marketing
  for (const [ids, category] of [[watchers, 'service'], [enquirers, 'marketing']] as const) {
    for (const c of await contactsByIds(ids)) {
      await queueEmail({
        to: c.email, toName: c.name, contactId: c.id, templateKey: 'price_change', category,
        context: { property_id: propertyId, promotes_property: true, vars }, idempotencyKey: `price:${propertyId}:${newPrice}:${c.id}`,
      })
    }
  }
}

export async function notifyUnavailable(propertyId: string, status: string) {
  const { watchers } = await interestedContacts(propertyId)
  for (const c of await contactsByIds(watchers)) {
    await queueEmail({
      to: c.email, toName: c.name, contactId: c.id, templateKey: 'property_unavailable', category: 'service',
      context: { property_id: propertyId, properties_mode: 'similar', vars: { property_status: status } },
      idempotencyKey: `unavailable:${propertyId}:${status}:${c.id}`,
    })
  }
  // Nothing already queued should keep promoting it
  await db().from('email_messages').update({ status: 'cancelled', status_reason: `Property ${status}` })
    .eq('property_id', propertyId).eq('status', 'queued')
    .in('template_key', ['new_property_announcement', 'nurture_property_details', 'nurture_consider', 'price_change'])
}
