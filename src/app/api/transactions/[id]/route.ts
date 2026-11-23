import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isUuid } from '@/lib/email/config'
import { changeStage } from '@/lib/email/transactions'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const client = db()
  const { data: t } = await client.from('transactions')
    .select('*, property:properties(id, title, district, price), lead:leads(id, name, phone, email, status), assignee:admin_users!transactions_assigned_to_fkey(id, name)')
    .eq('id', id).maybeSingle()
  if (!t) return bad('Not found', 404)
  if (auth.role === 'staff' && t.assigned_to !== auth.id) return bad('This transaction isn’t assigned to you', 403)
  const [events, emails] = await Promise.all([
    client.from('transaction_events').select('*').eq('transaction_id', id).order('created_at', { ascending: false }),
    client.from('email_messages').select('id, to_email, template_key, subject, status, status_reason, sent_at, created_at').eq('transaction_id', id).order('created_at', { ascending: false }),
  ])
  return NextResponse.json({ ...t, events: events.data || [], emails: emails.data || [] })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()

  // Plain edits (no stage change)
  const patch: Record<string, unknown> = {}
  if (raw.notes !== undefined) patch.notes = cleanText(raw.notes, 3000) || null
  if (raw.propertyId !== undefined) patch.property_id = isUuid(raw.propertyId) ? raw.propertyId : null
  if (raw.agreedPrice !== undefined) patch.agreed_price = Number(raw.agreedPrice) > 0 ? Math.round(Number(raw.agreedPrice)) : null
  if (raw.assignedTo !== undefined) {
    if (auth.role === 'staff') return bad('Only an admin can reassign', 403)
    patch.assigned_to = isUuid(raw.assignedTo) ? raw.assignedTo : null
  }
  if (Object.keys(patch).length) {
    const { data: t } = await client.from('transactions').select('assigned_to').eq('id', id).maybeSingle()
    if (!t) return bad('Not found', 404)
    if (auth.role === 'staff' && t.assigned_to !== auth.id) return bad('This transaction isn’t assigned to you', 403)
    const { error } = await client.from('transactions').update(patch).eq('id', id)
    if (error) return bad(error.message, 500)
  }

  if (raw.stage) {
    const amount = Number(raw.amount) > 0 ? Math.round(Number(raw.amount)) : null
    const r = await changeStage(id, { stage: String(raw.stage), note: cleanText(raw.note, 2000) || null, amount, notifyCustomer: raw.notifyCustomer === true }, auth)
    if (!r.ok) return bad(r.error, r.status || 400)
    kickWorker('transaction')
    return NextResponse.json({ ok: true, notified: r.notified })
  }
  return NextResponse.json({ ok: true })
}
