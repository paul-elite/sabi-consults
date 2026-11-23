import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db, isUuid } from '@/lib/email/config'
import { parseRange } from '@/lib/email/api'

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const p = request.nextUrl.searchParams
  const { from, to } = parseRange(p)
  const campaign = isUuid(p.get('campaign')) ? p.get('campaign') : null
  const client = db()
  const [main, campaigns] = await Promise.all([
    client.rpc('email_analytics', { p_from: from.toISOString(), p_to: to.toISOString(), p_campaign: campaign }),
    client.from('campaigns').select('id, name').in('status', ['sending', 'sent', 'paused', 'cancelled']).order('created_at', { ascending: false }).limit(100),
  ])
  if (main.error) return NextResponse.json({ error: main.error.message }, { status: 500 })
  // Previous period of the same length, for comparison
  const span = to.getTime() - from.getTime()
  const prev = await client.rpc('email_analytics', { p_from: new Date(from.getTime() - span).toISOString(), p_to: from.toISOString(), p_campaign: campaign })
  return NextResponse.json({ range: { from, to }, data: main.data, previous: prev.data?.totals || null, campaigns: campaigns.data || [] })
}
