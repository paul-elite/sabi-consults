import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { db } from '@/lib/email/config'
import { ensureDefaults } from '@/lib/email/store'
import { validateAutomation } from '@/lib/email/validate'
import { CONDITION_LABELS, EXIT_EVENTS, LEAD_STATUSES, TRIGGERS, ENQUIRY_TYPES, CONTACT_KINDS } from '@/lib/email/defaults'
import { bad } from '@/lib/email/api'

export async function GET() {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  await ensureDefaults()
  const client = db()
  const [{ data: autos, error }, { data: runs }, { data: templates }] = await Promise.all([
    client.from('automations').select('*').order('is_system', { ascending: false }).order('created_at'),
    client.from('automation_runs').select('automation_id, status').gte('started_at', new Date(Date.now() - 90 * 86400_000).toISOString()).limit(50000),
    client.from('email_templates').select('key, name, category, audience').order('name'),
  ])
  if (error) return bad(error.message, 500)
  const stats: Record<string, Record<string, number>> = {}
  for (const r of runs || []) {
    const s = (stats[r.automation_id] ||= { active: 0, completed: 0, exited: 0, failed: 0 })
    s[r.status] = (s[r.status] || 0) + 1
  }
  return NextResponse.json({
    automations: (autos || []).map(a => ({ ...a, stats: stats[a.id] || { active: 0, completed: 0, exited: 0, failed: 0 } })),
    meta: { triggers: TRIGGERS, exitEvents: EXIT_EVENTS, conditions: CONDITION_LABELS, leadStatuses: LEAD_STATUSES, enquiryTypes: ENQUIRY_TYPES, contactKinds: CONTACT_KINDS, templates: templates || [] },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request, 64 * 1024)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const { data: t } = await client.from('email_templates').select('key')
  const v = validateAutomation({ ...raw, active: false }, new Set((t || []).map(x => x.key)))
  if (!v.ok) return bad(v.error)
  // New workflows start switched off so nothing sends until an admin turns them on
  const { data, error } = await client.from('automations').insert({ ...v.value, active: false, is_system: false }).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json(data, { status: 201 })
}
