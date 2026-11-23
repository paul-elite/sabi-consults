// Campaign audiences. Only people who agreed to marketing, aren't suppressed and
// aren't archived can ever be selected; filters narrow that down.
import type { Db } from './config'
import type { Interests } from './contacts'

export interface AudienceFilter {
  kinds?: string[]
  tags?: string[]
  sources?: string[]
  districts?: string[]
  types?: string[]
  minScore?: number | null
  customersOnly?: boolean
  engagedWithinDays?: number | null
}
export interface ExcludeFilter {
  tags?: string[]
  kinds?: string[]
  emailedWithinDays?: number | null
}

export interface AudienceContact { id: string; email: string; name: string | null }

const PAGE = 500

/** One page of matching contacts, ordered by id so expansion can resume from a cursor. */
export async function audiencePage(client: Db, a: AudienceFilter, x: ExcludeFilter, after: string | null): Promise<{ rows: AudienceContact[]; last: string | null; scanned: number }> {
  let q = client.from('contacts')
    .select('id, email, name, kind, tags, interests, last_engaged_at, last_emailed_at, lead:leads(score)')
    .eq('marketing_status', 'subscribed').eq('suppressed', false).is('archived_at', null)
    .order('id').limit(PAGE)
  if (after) q = q.gt('id', after)
  if (a.kinds?.length) q = q.in('kind', a.kinds)
  if (a.tags?.length) q = q.overlaps('tags', a.tags)
  if (a.sources?.length) q = q.in('source', a.sources)
  if (a.customersOnly) q = q.contains('tags', ['customer'])
  const { data, error } = await q
  if (error) throw new Error(error.message)
  const rows = (data || []) as unknown as {
    id: string; email: string; name: string | null; kind: string; tags: string[]; interests: Interests
    last_engaged_at: string | null; last_emailed_at: string | null; lead: { score: number } | { score: number }[] | null
  }[]
  const now = Date.now()
  const lower = (arr?: string[]) => (arr || []).map(s => s.toLowerCase())
  const out = rows.filter(c => {
    const i = c.interests || {}
    if (a.districts?.length && !lower(i.districts).some(d => lower(a.districts).includes(d))) return false
    if (a.types?.length && !(i.types || []).some(t => a.types!.includes(t))) return false
    if (a.minScore) {
      const lead = Array.isArray(c.lead) ? c.lead[0] : c.lead
      if ((lead?.score || 0) < a.minScore) return false
    }
    if (a.engagedWithinDays && (!c.last_engaged_at || now - Date.parse(c.last_engaged_at) > a.engagedWithinDays * 86400_000)) return false
    if (x.tags?.length && (c.tags || []).some(t => x.tags!.includes(t))) return false
    if (x.kinds?.length && x.kinds.includes(c.kind)) return false
    if (x.emailedWithinDays && c.last_emailed_at && now - Date.parse(c.last_emailed_at) < x.emailedWithinDays * 86400_000) return false
    return true
  }).map(c => ({ id: c.id, email: c.email, name: c.name }))
  return { rows: out, last: rows.length ? rows[rows.length - 1].id : null, scanned: rows.length }
}

export async function countAudience(client: Db, a: AudienceFilter, x: ExcludeFilter): Promise<{ count: number; sample: AudienceContact[] }> {
  let after: string | null = null
  let count = 0
  const sample: AudienceContact[] = []
  for (let guard = 0; guard < 200; guard++) {
    const page = await audiencePage(client, a, x, after)
    count += page.rows.length
    if (sample.length < 5) sample.push(...page.rows.slice(0, 5 - sample.length))
    if (page.scanned < PAGE || !page.last) break
    after = page.last
  }
  return { count, sample }
}

export function cleanAudience(raw: unknown): AudienceFilter {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (v: unknown) => Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean).slice(0, 50) : []
  const n = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
  return {
    kinds: list(r.kinds), tags: list(r.tags), sources: list(r.sources), districts: list(r.districts), types: list(r.types),
    minScore: n(r.minScore), customersOnly: r.customersOnly === true, engagedWithinDays: n(r.engagedWithinDays),
  }
}
export function cleanExclude(raw: unknown): ExcludeFilter {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (v: unknown) => Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean).slice(0, 50) : []
  const n = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
  return { tags: list(r.tags), kinds: list(r.kinds), emailedWithinDays: n(r.emailedWithinDays) }
}
