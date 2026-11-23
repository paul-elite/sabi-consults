// Seeds built-in templates and workflows, and loads templates for sending.
import { db } from './config'
import { DEFAULT_AUTOMATIONS, DEFAULT_TEMPLATES, type TemplateDefault } from './defaults'

let seeded = false

/** Inserts any built-in template or workflow that isn't in the database yet. Never overwrites edits. */
export async function ensureDefaults(): Promise<void> {
  if (seeded) return
  const client = db()
  const { error: tErr } = await client.from('email_templates').upsert(
    DEFAULT_TEMPLATES.map(t => ({
      key: t.key, name: t.name, category: t.category, audience: t.audience,
      subject: t.subject, preheader: t.preheader || null, body: t.body,
      is_system: true, default_version: t.version || 1,
    })),
    { onConflict: 'key', ignoreDuplicates: true },
  )
  if (tErr) throw new Error(`Could not seed templates: ${tErr.message}`)
  const { error: aErr } = await client.from('automations').upsert(
    DEFAULT_AUTOMATIONS.map(a => ({
      key: a.key, name: a.name, description: a.description, trigger: a.trigger,
      conditions: a.conditions, steps: a.steps, exit_on: a.exit_on,
      allow_reenrol: !!a.allow_reenrol, is_system: true, active: true,
    })),
    { onConflict: 'key', ignoreDuplicates: true },
  )
  if (aErr) throw new Error(`Could not seed automations: ${aErr.message}`)
  seeded = true
}

export interface TemplateRow {
  key: string; name: string; category: string; audience: TemplateDefault['audience']
  subject: string; preheader: string | null; body: string; is_system: boolean; edited: boolean
  updated_at?: string
}

const tplCache = new Map<string, { at: number; row: TemplateRow }>()

export async function getTemplate(key: string): Promise<TemplateRow | null> {
  const hit = tplCache.get(key)
  if (hit && Date.now() - hit.at < 15_000) return hit.row
  await ensureDefaults()
  const { data } = await db().from('email_templates').select('*').eq('key', key).maybeSingle()
  let row = data as TemplateRow | null
  if (!row) {
    const d = DEFAULT_TEMPLATES.find(t => t.key === key)
    if (d) row = { ...d, preheader: d.preheader || null, is_system: true, edited: false }
  }
  if (row) tplCache.set(key, { at: Date.now(), row })
  return row
}

export function clearTemplateCache(key?: string) {
  if (key) tplCache.delete(key)
  else tplCache.clear()
}
