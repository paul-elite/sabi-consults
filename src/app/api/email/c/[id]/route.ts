import { NextRequest, NextResponse, after } from 'next/server'
import { db, isUuid, siteUrl } from '@/lib/email/config'
import { verifyClick } from '@/lib/email/send'
import { CLICK_COOKIE, clickCookieValue } from '@/lib/email/attribution'

// Tracked link from an email. The destination is signed, so this can't be used
// as an open redirect to another site.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const u = request.nextUrl.searchParams.get('u') || ''
  const s = request.nextUrl.searchParams.get('s') || ''
  let target = ''
  try { target = Buffer.from(u, 'base64url').toString('utf8') } catch { /* invalid */ }
  if (!isUuid(id) || !/^https?:\/\//i.test(target) || !verifyClick(id, target, s)) {
    return NextResponse.redirect(siteUrl(), 302)
  }

  // Record after redirecting, so the visitor doesn't wait on the database
  after(async () => {
    try {
      const client = db()
      const { data: m } = await client.from('email_messages').select('id, contact_id, lead_id, clicked_at, click_count').eq('id', id).maybeSingle()
      if (!m) return
      const now = new Date().toISOString()
      await client.from('email_messages').update({ clicked_at: m.clicked_at || now, click_count: (m.click_count || 0) + 1 }).eq('id', id)
      await client.from('email_events').insert({ message_id: id, contact_id: m.contact_id, type: 'clicked', url: target.slice(0, 1000), payload: { ua: (request.headers.get('user-agent') || '').slice(0, 200) } })
      if (m.contact_id) await client.from('contacts').update({ last_engaged_at: now }).eq('id', m.contact_id)
      let leadId = m.lead_id
      if (!leadId && m.contact_id) leadId = (await client.from('contacts').select('lead_id').eq('id', m.contact_id).maybeSingle()).data?.lead_id
      if (leadId) {
        await client.from('leads').update({ last_activity_at: now }).eq('id', leadId)
        await client.rpc('calculate_lead_score', { p_lead_id: leadId })
      }
    } catch (err) { console.error('click record failed', err) }
  })

  const res = NextResponse.redirect(target, 302)
  // Lets an enquiry or booking within 7 days be credited to this email
  if (new URL(target).host === new URL(siteUrl()).host || new URL(target).host === request.nextUrl.host) {
    res.cookies.set(CLICK_COOKIE, clickCookieValue(id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400, path: '/' })
  }
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
