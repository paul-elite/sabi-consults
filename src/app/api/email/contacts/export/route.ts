import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/email/config'
import { csvEscape } from '@/lib/email/api'

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const p = request.nextUrl.searchParams
  let q = db().from('contacts').select('email, name, phone, kind, tags, source, marketing_status, consent_at, consent_source, unsubscribed_at, suppressed, frequency, interests, last_engaged_at, created_at').order('created_at').limit(20000)
  if (p.get('status')) q = q.eq('marketing_status', String(p.get('status')))
  if (p.get('kind')) q = q.eq('kind', String(p.get('kind')))
  if (p.get('archived') !== '1') q = q.is('archived_at', null)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const cols = ['email', 'name', 'phone', 'kind', 'tags', 'source', 'marketing_status', 'consent_at', 'consent_source', 'unsubscribed_at', 'suppressed', 'frequency', 'districts', 'types', 'last_engaged_at', 'created_at']
  const lines = [cols.join(',')]
  for (const r of (data || []) as Record<string, any>[]) {
    lines.push(cols.map(c => csvEscape(c === 'districts' ? r.interests?.districts : c === 'types' ? r.interests?.types : r[c])).join(','))
  }
  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"` },
  })
}
