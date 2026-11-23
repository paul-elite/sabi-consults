// Helpers shared by the public email forms.
import { hmacTag } from '@/lib/auth'
import { cleanText } from '@/lib/sanitize'
import { formatNaira } from '@/lib/format'
import type { Interests } from './contacts'

export const guideTag = (slug: string, contactId: string) => hmacTag('guide', `${slug}|${contactId}`, 20)

export function cleanInterests(raw: unknown): Interests {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (v: unknown, n = 30) => Array.isArray(v) ? v.map(x => cleanText(x, 60)).filter(Boolean).slice(0, n) : []
  const num = (v: unknown) => (Number(v) > 0 ? Math.round(Number(v)) : null)
  return {
    types: list(r.types, 2).filter(t => t === 'house' || t === 'land'),
    districts: list(r.districts),
    topics: list(r.topics, 10),
    minBudget: num(r.minBudget), maxBudget: num(r.maxBudget), bedrooms: num(r.bedrooms),
  }
}


export function describe(c: Interests): string {
  const what = c.types?.length === 1 ? (c.types[0] === 'land' ? 'Land' : 'Houses') : 'Houses and land'
  const parts = [what]
  if (c.bedrooms) parts.push(`with ${c.bedrooms}+ bedrooms`)
  if (c.districts?.length) parts.push(`in ${c.districts.join(', ')}`)
  if (c.minBudget && c.maxBudget) parts.push(`between ${formatNaira(c.minBudget)} and ${formatNaira(c.maxBudget)}`)
  else if (c.maxBudget) parts.push(`up to ${formatNaira(c.maxBudget)}`)
  else if (c.minBudget) parts.push(`from ${formatNaira(c.minBudget)}`)
  return parts.join(' ')
}
