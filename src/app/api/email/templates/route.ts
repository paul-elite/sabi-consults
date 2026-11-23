import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { db } from '@/lib/email/config'
import { ensureDefaults, getTemplate } from '@/lib/email/store'
import { TEMPLATE_CATEGORIES } from '@/lib/email/defaults'
import { bad } from '@/lib/email/api'

export async function GET() {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  await ensureDefaults()
  const client = db()
  const { data, error } = await client.from('email_templates').select('key, name, category, audience, subject, is_system, edited, updated_at').order('category').order('name')
  if (error) return bad(error.message, 500)
  // Usage in the last 90 days, so admins can see which templates matter
  const since = new Date(Date.now() - 90 * 86400_000).toISOString()
  const { data: usage } = await client.from('email_messages').select('template_key, status, clicked_at').gte('created_at', since).limit(50000)
  const u: Record<string, { sent: number; clicked: number }> = {}
  for (const r of usage || []) {
    const x = (u[r.template_key] ||= { sent: 0, clicked: 0 })
    if (['sent', 'delivered', 'bounced', 'complained'].includes(r.status)) x.sent++
    if (r.clicked_at) x.clicked++
  }
  return NextResponse.json({ templates: (data || []).map(t => ({ ...t, usage: u[t.key] || { sent: 0, clicked: 0 } })), categories: TEMPLATE_CATEGORIES })
}

// Create a template, optionally as a copy of another
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request, 64 * 1024)
  if (raw instanceof NextResponse) return raw
  const from = raw.fromKey ? await getTemplate(String(raw.fromKey)) : null
  const name = cleanText(raw.name, 120) || (from ? `${from.name} (copy)` : 'New template')
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'template'
  const client = db()
  let key = `custom_${base}`
  for (let i = 2; (await client.from('email_templates').select('key').eq('key', key).maybeSingle()).data; i++) key = `custom_${base}_${i}`
  const audience = ['transactional', 'service', 'marketing', 'internal'].includes(String(raw.audience)) ? String(raw.audience) : from?.audience || 'marketing'
  const { data, error } = await client.from('email_templates').insert({
    key, name, category: from?.category || (TEMPLATE_CATEGORIES[String(raw.category)] ? String(raw.category) : 'newsletter'), audience,
    subject: from?.subject || 'Subject line', preheader: from?.preheader || null,
    body: from?.body || 'Hi {{first_name|there}},\n\nWrite your message here.\n\n[[button Browse properties | {{site_url}}/properties]]',
    is_system: false,
  }).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json(data, { status: 201 })
}
