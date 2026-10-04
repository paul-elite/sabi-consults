// Server-only request helpers shared by the public and admin API routes.
//
// The limiter is in memory, so on serverless hosting each instance keeps its
// own counts. That still stops scripted bursts from one client; buckets are
// pruned so a flood of distinct keys can't grow memory without bound.
import { NextRequest, NextResponse } from 'next/server'

const buckets = new Map<string, number[]>()
let lastSweep = 0

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, hits] of buckets) {
    // Longest window in use is one hour
    if (!hits.length || now - hits[hits.length - 1] > 60 * 60 * 1000) buckets.delete(key)
  }
  // Hard ceiling in case of a key flood within the hour
  if (buckets.size > 50_000) buckets.clear()
}

/**
 * Records `count` hits for `key` and reports whether it stays within `limit` per `windowMs`.
 * Hits are only recorded when allowed, so a blocked client can't extend its own lockout forever.
 */
export function rateLimit(key: string, limit: number, windowMs: number, count = 1): boolean {
  const now = Date.now()
  sweep(now)
  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs)
  if (hits.length + count > limit) {
    buckets.set(key, hits)
    return false
  }
  for (let i = 0; i < count; i++) hits.push(now)
  buckets.set(key, hits)
  return true
}

/** Peek without recording, e.g. to check a lockout before doing expensive work. */
export function isLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  return (buckets.get(key) || []).filter(t => now - t < windowMs).length >= limit
}

export function resetLimit(key: string) {
  buckets.delete(key)
}

/**
 * The visitor's IP. Vercel sets x-real-ip and overwrites x-forwarded-for, so
 * neither can be spoofed there; the fallback keeps local development working.
 */
export function clientIp(request: NextRequest | Request): string {
  const h = request.headers
  return (h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim().slice(0, 64)
}

/**
 * Parses a JSON body, refusing anything over `maxBytes` before it is buffered in full.
 * Returns a NextResponse to send back when the body is missing, too large or malformed.
 */
export async function readJson<T = Record<string, unknown>>(
  request: NextRequest | Request,
  maxBytes = 32 * 1024,
): Promise<T | NextResponse> {
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > maxBytes) return NextResponse.json({ error: 'Request is too large' }, { status: 413 })
  try {
    const text = await request.text()
    if (Buffer.byteLength(text) > maxBytes) return NextResponse.json({ error: 'Request is too large' }, { status: 413 })
    const data = JSON.parse(text)
    if (!data || typeof data !== 'object') throw new Error('not an object')
    return data as T
  } catch {
    return NextResponse.json({ error: 'Send a valid JSON body' }, { status: 400 })
  }
}
