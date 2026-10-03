// Shared display helpers for prices and property facts.
import type { Property } from './types'

/** ₦57M, ₦1.2B, ₦850K. Keeps one decimal only when it matters (₦2.5M, not ₦3M). */
export function formatPrice(price: number): string {
  const trim = (n: number) => (Math.round(n * 10) / 10).toString()
  if (price >= 1_000_000_000) return `₦${trim(price / 1_000_000_000)}B`
  if (price >= 1_000_000) return `₦${trim(price / 1_000_000)}M`
  if (price >= 1_000) return `₦${trim(price / 1_000)}K`
  return `₦${price.toLocaleString()}`
}

/** Full Naira amount, for detail pages: ₦57,000,000 */
export function formatNaira(price: number): string {
  return `₦${price.toLocaleString('en-NG')}`
}

/** Headline price text, e.g. "From ₦57M" or "Price on request". */
export function priceHeadline(p: Pick<Property, 'price' | 'priceLabel' | 'variations'>): { amount: string; label: string } {
  if (!p.price || p.price <= 0) return { amount: p.priceLabel || 'Price on request', label: '' }
  const many = (p.variations?.length || 0) > 1
  const label = (p.priceLabel || '').toLowerCase()
  const isFrom = many || /from|start/.test(label)
  return { amount: formatPrice(p.price), label: isFrom ? 'From' : p.priceLabel || '' }
}

/** Short fact list for cards: "3 beds · 1 BQ · 150 sqm" */
export function propertyFacts(p: Property): string[] {
  const facts: string[] = []
  if (p.type === 'house') {
    if (p.bedrooms && p.bedrooms > 0) facts.push(`${p.bedrooms} bed${p.bedrooms > 1 ? 's' : ''}`)
    if (p.bathrooms && p.bathrooms > 0) facts.push(`${p.bathrooms} bath${p.bathrooms > 1 ? 's' : ''}`)
    if (p.bq && p.bq > 0) facts.push(`${p.bq} BQ`)
  }
  if (p.landSize && p.landSize > 0) facts.push(`${p.landSize.toLocaleString()} sqm`)
  return facts
}

/** Card eyebrow: omit the district and trailing location directions from the name. */
export function propertyCardName(p: Pick<Property, 'title' | 'district' | 'type'>): string {
  const district = p.district.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let name = p.title.trim().replace(/,\s*(?:behind|near|opposite|beside|along)\b.*$/i, '')
  if (district) {
    name = name
      .replace(new RegExp(`^${district}(?:\\s*[,–—-]\\s*|\\s+|$)`, 'i'), '')
      .replace(new RegExp(`(?:\\s*[,–—-]\\s*|\\s+(?:in|at)\\s+|\\s+)${district}$`, 'i'), '')
  }
  return name.trim() || (p.type === 'land' ? 'Land' : 'House')
}
