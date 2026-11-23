// Small helpers shared by the admin email API routes.
import { NextResponse } from 'next/server'
import type { SessionUser } from '@/lib/auth'

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
export const actorName = (u: SessionUser) => u.name || u.email
export const actorId = (u: SessionUser) => (u.id === 'env' ? null : u.id)

export function parseRange(params: URLSearchParams): { from: Date; to: Date } {
  const to = params.get('to') ? new Date(String(params.get('to'))) : new Date()
  const from = params.get('from') ? new Date(String(params.get('from'))) : new Date(to.getTime() - 30 * 86400_000)
  const ok = (d: Date) => !isNaN(d.getTime())
  const end = ok(to) ? to : new Date()
  // Include the whole "to" day when only a date was given
  if (params.get('to') && /^\d{4}-\d{2}-\d{2}$/.test(String(params.get('to')))) end.setUTCHours(23, 59, 59, 999)
  return { from: ok(from) ? from : new Date(end.getTime() - 30 * 86400_000), to: end }
}

export function csvEscape(v: unknown): string {
  let s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v)
  // Stop spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Minimal CSV parser (quotes, commas, newlines in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim()))
}
