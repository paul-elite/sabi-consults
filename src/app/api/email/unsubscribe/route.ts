import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '@/lib/rate-limit'
import { db } from '@/lib/email/config'
import { readContactToken, unsubscribe } from '@/lib/email/contacts'

/**
 * Unsubscribe. Handles the one-click POST that Gmail and Apple Mail send from
 * the List-Unsubscribe header (RFC 8058), and the button on /email/unsubscribe.
 * Transactional emails (confirmations, inspection details) are not affected.
 */
export async function POST(request: NextRequest) {
  let token = request.nextUrl.searchParams.get('t')
  let scope: 'marketing' | 'all' = 'marketing'
  const type = request.headers.get('content-type') || ''
  if (type.includes('application/json')) {
    const body = await request.json().catch(() => ({})) as { t?: string; scope?: string }
    token = body.t || token
    if (body.scope === 'all') scope = 'all'
  }
  const id = readContactToken(token, 'unsub') || readContactToken(token, 'prefs')
  if (!id) return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 404 })
  const { data: c } = await db().from('contacts').select('id, marketing_status, followups_opt_out').eq('id', id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const already = c.marketing_status === 'unsubscribed' && (scope === 'marketing' || c.followups_opt_out)
  if (!already) {
    await unsubscribe(id, scope, { ip: clientIp(request), userAgent: request.headers.get('user-agent') || undefined, source: type.includes('json') ? 'unsubscribe_page' : 'one_click_header' })
  }
  return NextResponse.json({ ok: true })
}
