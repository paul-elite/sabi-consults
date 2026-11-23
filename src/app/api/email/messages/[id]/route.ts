import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { db, isUuid } from '@/lib/email/config'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

// What was actually sent (the stored HTML), plus its event history
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const client = db()
  const { data } = await client.from('email_messages').select('*').eq('id', id).maybeSingle()
  if (!data) return bad('Not found', 404)
  const { data: events } = await client.from('email_events').select('type, url, occurred_at').eq('message_id', id).order('occurred_at')
  return NextResponse.json({ ...data, events: events || [] })
}

/** retry a failed/skipped message, or cancel a queued one */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const { data: m } = await client.from('email_messages').select('status, category, expires_at').eq('id', id).maybeSingle()
  if (!m) return bad('Not found', 404)
  if (raw.action === 'cancel') {
    if (m.status !== 'queued') return bad('Only queued emails can be cancelled')
    await client.from('email_messages').update({ status: 'cancelled', status_reason: `Cancelled by ${auth.name}` }).eq('id', id).eq('status', 'queued')
    return NextResponse.json({ ok: true })
  }
  if (raw.action === 'retry') {
    // Retrying reuses the same message id, which is also the provider idempotency key: it can't double-send
    if (!['failed', 'skipped'].includes(m.status)) return bad('Only failed or skipped emails can be retried')
    await client.from('email_messages').update({
      status: 'queued', attempts: 0, send_after: new Date().toISOString(), status_reason: `Retried by ${auth.name}`,
      expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    }).eq('id', id)
    kickWorker('retry-message')
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
