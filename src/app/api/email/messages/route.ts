import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isUuid } from '@/lib/email/config'
import { queueEmail } from '@/lib/email/send'
import { getTemplate } from '@/lib/email/store'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

// Delivery log with filters
export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const p = request.nextUrl.searchParams
  let q = db().from('email_messages')
    .select('id, to_email, category, template_key, subject, status, status_reason, attempts, send_after, sent_at, delivered_at, opened_at, clicked_at, campaign_id, automation_id, contact_id, lead_id, created_at')
    .order('created_at', { ascending: false }).limit(Math.min(500, Number(p.get('limit')) || 100))
  if (p.get('status')) q = q.in('status', String(p.get('status')).split(','))
  if (isUuid(p.get('contactId'))) q = q.eq('contact_id', String(p.get('contactId')))
  if (isUuid(p.get('leadId'))) q = q.eq('lead_id', String(p.get('leadId')))
  if (p.get('category')) q = q.eq('category', String(p.get('category')))
  const { data, error } = await q
  if (error) return bad(error.message, 500)
  return NextResponse.json(data || [])
}

/**
 * Send one email to a contact from a template (e.g. a property recommendation
 * from the lead page). Consent rules still apply: marketing templates only reach
 * subscribed contacts. Payment and transaction templates are sent from the
 * transaction screen, not here.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const contactId = isUuid(raw.contactId) ? String(raw.contactId) : null
  const leadId = isUuid(raw.leadId) ? String(raw.leadId) : null
  if (!contactId) return bad('This person has no email address on file')
  const { data: c } = await client.from('contacts').select('id, email, name, lead_id').eq('id', contactId).maybeSingle()
  if (!c) return bad('Contact not found', 404)
  if (auth.role === 'staff') {
    const lid = leadId || c.lead_id
    const { data: l } = lid ? await client.from('leads').select('assigned_to').eq('id', lid).maybeSingle() : { data: null }
    if (!l || l.assigned_to !== auth.id) return bad('This lead isn’t assigned to you', 403)
  }
  const key = String(raw.templateKey || '')
  const tpl = await getTemplate(key)
  if (!tpl || tpl.audience === 'internal') return bad('Choose a template')
  if (tpl.category === 'transaction' || tpl.category === 'subscription') return bad('That email is sent automatically from the right screen')
  const propertyIds = Array.isArray(raw.propertyIds) ? raw.propertyIds.filter(isUuid).slice(0, 6) as string[] : []
  const propertyId = isUuid(raw.propertyId) ? String(raw.propertyId) : propertyIds[0] || null
  const q = await queueEmail({
    to: c.email, toName: c.name, contactId: c.id, templateKey: key,
    context: { lead_id: leadId || c.lead_id, property_id: propertyId, property_ids: propertyIds.length > 1 ? propertyIds : undefined, properties_mode: propertyIds.length > 1 ? undefined : 'match', vars: { note: cleanText(raw.note, 1000) } },
    idempotencyKey: `manual:${c.id}:${key}:${Date.now()}`, createdBy: auth.name, leadId: leadId || c.lead_id,
  })
  const lid = leadId || c.lead_id
  if (lid) await client.from('lead_activities').insert({ lead_id: lid, type: 'email', to_value: tpl.name, actor_id: auth.id === 'env' ? null : auth.id, actor_name: auth.name })
  if (lid) await client.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', lid)
  kickWorker('manual-email')
  return NextResponse.json({ ok: true, id: q.id, status: q.status }, { status: 201 })
}
