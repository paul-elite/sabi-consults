import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isUuid } from '@/lib/email/config'
import { emitEvent } from '@/lib/email/events'
import { kickWorker } from '@/lib/email/worker'
import { queueEmail } from '@/lib/email/send'
import { scheduleInspectionReminders } from '@/lib/email/handlers'
import { actorId, bad } from '@/lib/email/api'

/**
 * Inspection actions: confirm (book or reschedule), assign, cancel, complete, no_show, notes.
 * Each action emits an event; the workflows decide which emails go out.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Inspection not found', 404)
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const { data: v } = await client.from('viewing_requests').select('*').eq('id', id).maybeSingle()
  if (!v) return bad('Inspection not found', 404)
  if (auth.role === 'staff' && v.assigned_to !== auth.id) return bad('This inspection isn’t assigned to you', 403)

  const action = String(raw.action || '')
  const now = new Date().toISOString()
  const base = { viewing_id: id, lead_id: v.lead_id, contact_id: v.contact_id, property_id: v.property_id }
  const patch: Record<string, unknown> = {}
  let event: { type: Parameters<typeof emitEvent>[0]; key: string; extra?: Record<string, unknown> } | null = null

  if (raw.agentNotes !== undefined) patch.agent_notes = cleanText(raw.agentNotes, 2000) || null
  if (raw.assignedTo !== undefined && auth.role !== 'staff') {
    const to = raw.assignedTo ? String(raw.assignedTo) : null
    if (to && !isUuid(to)) return bad('Choose a staff member')
    patch.assigned_to = to
  }

  switch (action) {
    case 'confirm': {
      const when = new Date(String(raw.datetime || ''))
      if (isNaN(when.getTime())) return bad('Choose the inspection date and time')
      if (when.getTime() < Date.now() - 60 * 60_000) return bad('That time is in the past')
      const rescheduled = v.status === 'confirmed' && v.confirmed_datetime && new Date(v.confirmed_datetime).getTime() !== when.getTime()
      if (v.status === 'confirmed' && !rescheduled && raw.assignedTo === undefined) return bad('That is already the booked time')
      patch.status = 'confirmed'
      patch.confirmed_datetime = when.toISOString()
      patch.cancelled_at = null
      patch.missed_alert_at = null
      event = rescheduled
        ? { type: 'inspection.rescheduled', key: `inspection.rescheduled:${id}:${when.toISOString()}`, extra: { rescheduled: true, inspection_event: 'rescheduled' } }
        : v.status === 'confirmed' ? null : { type: 'inspection.booked', key: `inspection.booked:${id}:${when.toISOString()}`, extra: { inspection_event: 'booked' } }
      break
    }
    case 'cancel':
      if (v.status === 'cancelled') return bad('Already cancelled')
      patch.status = 'cancelled'; patch.cancelled_at = now
      event = { type: 'inspection.cancelled', key: `inspection.cancelled:${id}:${now}`, extra: { inspection_event: 'cancelled' } }
      break
    case 'complete':
      if (v.status === 'completed') return bad('Already completed')
      patch.status = 'completed'; patch.completed_at = now
      if (raw.feedback !== undefined) patch.feedback = cleanText(raw.feedback, 2000) || null
      event = { type: 'inspection.completed', key: `inspection.completed:${id}`, extra: { inspection_event: 'completed' } }
      break
    case 'no_show':
      patch.status = 'no_show'
      event = { type: 'inspection.no_show', key: `inspection.no_show:${id}`, extra: { inspection_event: 'marked no-show' } }
      break
    case '':
    case 'update':
      break
    default:
      return bad('Unknown action')
  }

  const { data, error } = await client.from('viewing_requests').update(patch).eq('id', id).select().single()
  if (error) return bad(error.message, 500)

  if (event) {
    // Rescheduled confirmations use the same template with a flag
    await emitEvent(event.type, { ...base, ...(event.extra ? { vars: event.extra } : {}), subject_key: `inspection:${id}` }, event.key)
    if (v.lead_id) {
      const label = action === 'confirm' ? 'Inspection booked' : action === 'cancel' ? 'Inspection cancelled' : action === 'complete' ? 'Inspection completed' : 'No-show'
      await client.from('lead_activities').insert({ lead_id: v.lead_id, type: 'inspection', to_value: label, actor_id: actorId(auth), actor_name: auth.name })
    }
  }
  if (patch.assigned_to && patch.assigned_to !== v.assigned_to && data.status === 'confirmed' && !event) {
    // New agent on an already-booked inspection: tell them, and give them the day-before reminder
    const { data: agent } = await client.from('admin_users').select('email, name').eq('id', patch.assigned_to as string).maybeSingle()
    if (agent?.email) {
      await queueEmail({
        to: agent.email, toName: agent.name, templateKey: 'internal_inspection', category: 'internal',
        context: { viewing_id: id, lead_id: v.lead_id, property_id: v.property_id, admin_path: '/admin/inspections', vars: { inspection_event: 'assigned to you' } },
        idempotencyKey: `inspection-assigned:${id}:${patch.assigned_to}`,
      })
    }
    await scheduleInspectionReminders(id)
  }
  kickWorker('inspection-update')
  return NextResponse.json(data)
}
