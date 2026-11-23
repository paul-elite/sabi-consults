import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db } from '@/lib/email/config'
import { CAMPAIGN_TYPES } from '@/lib/email/defaults'
import { bad } from '@/lib/email/api'

export async function GET() {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const client = db()
  const { data, error } = await client.from('campaigns').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) return bad(error.message, 500)
  // Per-campaign delivery counts
  const ids = (data || []).filter(c => c.status !== 'draft').map(c => c.id)
  const stats: Record<string, { sent: number; clicked: number; queued: number }> = {}
  if (ids.length) {
    const { data: rows } = await client.from('email_messages').select('campaign_id, status, clicked_at').in('campaign_id', ids).limit(50000)
    for (const r of rows || []) {
      const s = (stats[r.campaign_id] ||= { sent: 0, clicked: 0, queued: 0 })
      if (['sent', 'delivered', 'bounced', 'complained'].includes(r.status)) s.sent++
      if (['queued', 'sending'].includes(r.status)) s.queued++
      if (r.clicked_at) s.clicked++
    }
  }
  return NextResponse.json((data || []).map(c => ({ ...c, stats: stats[c.id] || null })))
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const type = CAMPAIGN_TYPES.find(t => t.value === raw.type) || CAMPAIGN_TYPES[1]
  const name = cleanText(raw.name, 120) || `${type.label} – ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
  const audience = type.value === 'owner_acquisition' ? { kinds: ['owner', 'landowner'] }
    : type.value === 'partnership' ? { kinds: ['developer', 'corporate', 'partner'] }
      : type.value === 'retention' ? { customersOnly: true } : { kinds: ['buyer'] }
  const { data, error } = await db().from('campaigns').insert({
    name, type: type.value, template_key: type.template, subject: '', body: '', audience, created_by: auth.name,
  }).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json(data, { status: 201 })
}
