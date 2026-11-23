import { NextRequest, NextResponse, after } from 'next/server'
import { db, isUuid } from '@/lib/email/config'

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// Open pixel. Recorded, but treated as a weak signal: Apple Mail Privacy
// Protection and Gmail's image proxy load it without a person reading anything.
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (isUuid(id)) {
    after(async () => {
      try {
        const client = db()
        const { data: m } = await client.from('email_messages').select('opened_at, open_count, contact_id').eq('id', id).maybeSingle()
        if (!m) return
        await client.from('email_messages').update({ opened_at: m.opened_at || new Date().toISOString(), open_count: (m.open_count || 0) + 1 }).eq('id', id)
        if (!m.opened_at) await client.from('email_events').insert({ message_id: id, contact_id: m.contact_id, type: 'opened', provider_event_id: `pixel:${id}` })
      } catch { /* never fail an image */ }
    })
  }
  return new NextResponse(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' } })
}
