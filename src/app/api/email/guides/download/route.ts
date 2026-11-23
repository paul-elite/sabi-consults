import { NextRequest, NextResponse } from 'next/server'
import { verifyTag } from '@/lib/auth'
import { db, isUuid } from '@/lib/email/config'

// Signed download link from the guide email; also counts as engagement
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const slug = (p.get('g') || '').slice(0, 80)
  const contactId = p.get('c') || ''
  const tag = p.get('s') || ''
  if (!isUuid(contactId) || !verifyTag('guide', `${slug}|${contactId}`, tag, 20)) {
    return NextResponse.redirect(new URL('/guides', request.url))
  }
  const client = db()
  const { data: guide } = await client.from('lead_magnets').select('file_url').eq('slug', slug).maybeSingle()
  if (!guide?.file_url || !/^https?:\/\//.test(guide.file_url)) return NextResponse.redirect(new URL('/guides', request.url))
  await client.from('contacts').update({ last_engaged_at: new Date().toISOString() }).eq('id', contactId)
  return NextResponse.redirect(guide.file_url, 302)
}
