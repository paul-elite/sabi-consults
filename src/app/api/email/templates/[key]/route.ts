import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db, isEmail, isUuid } from '@/lib/email/config'
import { clearTemplateCache, getTemplate } from '@/lib/email/store'
import { DEFAULT_TEMPLATES } from '@/lib/email/defaults'
import { previewTemplate, queueEmail } from '@/lib/email/send'
import type { ContactRow } from '@/lib/email/contacts'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

const validKey = (k: string) => /^[a-z0-9_]{2,80}$/.test(k)

export async function GET(_: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { key } = await params
  if (!validKey(key)) return bad('Not found', 404)
  const t = await getTemplate(key)
  if (!t) return bad('Not found', 404)
  const { data: used } = await db().from('automations').select('id, name, steps')
  const usedBy = (used || []).filter(a => JSON.stringify(a.steps).includes(`"${key}"`) || (key.endsWith('enquiry_confirmation') && JSON.stringify(a.steps).includes('auto:enquiry'))).map(a => ({ id: a.id, name: a.name }))
  return NextResponse.json({ ...t, hasDefault: DEFAULT_TEMPLATES.some(d => d.key === key), usedBy })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { key } = await params
  if (!validKey(key)) return bad('Not found', 404)
  const raw = await readJson(request, 64 * 1024)
  if (raw instanceof NextResponse) return raw
  const client = db()
  if (raw.reset === true) {
    const d = DEFAULT_TEMPLATES.find(t => t.key === key)
    if (!d) return bad('This template has no original version')
    await client.from('email_templates').update({ name: d.name, subject: d.subject, preheader: d.preheader || null, body: d.body, edited: false }).eq('key', key)
    clearTemplateCache(key)
    return NextResponse.json({ ok: true })
  }
  const subject = cleanText(raw.subject, 200)
  const body = String(raw.body ?? '').slice(0, 30000)
  if (!subject) return bad('Add a subject line')
  if (!body.trim()) return bad('The email needs some content')
  const patch: Record<string, unknown> = { subject, body, preheader: cleanText(raw.preheader, 200) || null, edited: true }
  if (raw.name) patch.name = cleanText(raw.name, 120)
  const { data: t } = await client.from('email_templates').select('is_system').eq('key', key).maybeSingle()
  if (!t) return bad('Not found', 404)
  if (!t.is_system && ['transactional', 'service', 'marketing', 'internal'].includes(String(raw.audience))) patch.audience = raw.audience
  const { error } = await client.from('email_templates').update(patch).eq('key', key)
  if (error) return bad(error.message, 500)
  clearTemplateCache(key)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { key } = await params
  if (!validKey(key)) return bad('Not found', 404)
  const client = db()
  const { data: t } = await client.from('email_templates').select('is_system').eq('key', key).maybeSingle()
  if (!t) return bad('Not found', 404)
  if (t.is_system) return bad('Built-in templates can’t be deleted. You can reset them instead.')
  const { count } = await client.from('campaigns').select('id', { count: 'exact', head: true }).eq('template_key', key).in('status', ['draft', 'scheduled', 'sending', 'paused'])
  if (count) return bad('A campaign still uses this template')
  await client.from('email_templates').delete().eq('key', key)
  clearTemplateCache(key)
  return NextResponse.json({ ok: true })
}

/** Preview (renders unsaved edits with real data) or send a test. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { key } = await params
  if (!validKey(key)) return bad('Not found', 404)
  const raw = await readJson(request, 64 * 1024)
  if (raw instanceof NextResponse) return raw
  const saved = await getTemplate(key)
  if (!saved) return bad('Not found', 404)
  const client = db()
  // Real records make the preview honest; fall back to the newest available listing
  let propertyId = isUuid(raw.propertyId) ? String(raw.propertyId) : null
  if (!propertyId) propertyId = (await client.from('properties').select('id').eq('status', 'available').order('created_at', { ascending: false }).limit(1).maybeSingle()).data?.id || null
  let contact: ContactRow | null = null
  if (isUuid(raw.contactId)) contact = (await client.from('contacts').select('*').eq('id', String(raw.contactId)).maybeSingle()).data as ContactRow | null

  if (raw.action === 'test') {
    const to = String(raw.to || auth.email).toLowerCase()
    if (!isEmail(to)) return bad('Enter a valid email for the test')
    if (raw.body !== undefined) return bad('Save your changes before sending a test')
    const q = await queueEmail({
      to, templateKey: key, category: 'internal',
      context: { property_id: propertyId, properties_mode: 'similar', vars: { reference: 'SC-TEST', when: 'tomorrow' } },
      idempotencyKey: `template-test:${key}:${to}:${Date.now()}`, createdBy: auth.name,
    })
    kickWorker('template-test')
    return NextResponse.json({ ok: true, messageId: q.id })
  }

  const tpl = {
    subject: raw.subject !== undefined ? String(raw.subject) : saved.subject,
    preheader: raw.preheader !== undefined ? String(raw.preheader) : saved.preheader,
    body: raw.body !== undefined ? String(raw.body).slice(0, 30000) : saved.body,
    audience: saved.audience,
  }
  const r = await previewTemplate(tpl, { property_id: propertyId, properties_mode: 'similar', vars: { campaign_body: 'Your campaign text appears here.' } }, contact)
  return NextResponse.json(r)
}
