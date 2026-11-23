import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isUuid } from '@/lib/email/config'
import { isStorageImageUrl } from '@/lib/storage-url'
import { bad } from '@/lib/email/api'

// Guides: an admin attaches a file (uploaded to storage, or a link) and switches it on
export async function PUT(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const patch: Record<string, unknown> = {}
  if (raw.title !== undefined) patch.title = cleanText(raw.title, 160)
  if (raw.description !== undefined) patch.description = cleanText(raw.description, 400) || null
  if (raw.fileUrl !== undefined) {
    const url = String(raw.fileUrl || '').trim()
    if (url && !(isStorageImageUrl(url) || /^https:\/\/[^\s]+$/.test(url))) return bad('Use an https link to the file')
    patch.file_url = url || null
  }
  if (typeof raw.active === 'boolean') patch.active = raw.active
  if (isUuid(raw.id)) {
    const { data: g } = await client.from('lead_magnets').select('file_url').eq('id', String(raw.id)).maybeSingle()
    if (!g) return bad('Not found', 404)
    if (patch.active === true && !(patch.file_url ?? g.file_url)) return bad('Attach the file before switching the guide on')
    await client.from('lead_magnets').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', String(raw.id))
    return NextResponse.json({ ok: true })
  }
  if (!patch.title) return bad('Give the guide a title')
  const slug = String(patch.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  const { data, error } = await client.from('lead_magnets').insert({ ...patch, slug, active: !!patch.file_url && patch.active === true, sort_order: 99 }).select().single()
  if (error) return bad(error.code === '23505' ? 'A guide with that title already exists' : error.message)
  return NextResponse.json(data, { status: 201 })
}
