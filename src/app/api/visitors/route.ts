import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient as db } from '@/lib/auth'

const RANGES = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 } as const
type Range = keyof typeof RANGES
const PAGE = 1000      // PostgREST returns at most 1000 rows per request
const MAX_ROWS = 50000 // ceiling for one summary
const TZ = 'Africa/Lagos'

interface Visit {
  created_at: string
  visitor_id: string | null
  path: string
  referrer: string | null
  source: string
  medium: string
  utm_campaign: string | null
  country: string | null
  region: string | null
  city: string | null
  device: string | null
  browser: string | null
  os: string | null
  is_bot: boolean
}

function tally<T extends string>(rows: Visit[], key: (v: Visit) => T | null, limit = 10) {
  const visits = new Map<T, number>()
  const people = new Map<T, Set<string>>()
  for (const v of rows) {
    const k = key(v)
    if (!k) continue
    visits.set(k, (visits.get(k) || 0) + 1)
    if (v.visitor_id) {
      if (!people.has(k)) people.set(k, new Set())
      people.get(k)!.add(v.visitor_id)
    }
  }
  return [...visits.entries()]
    .map(([name, count]) => ({ name, visits: count, visitors: people.get(name)?.size || 0 }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit)
}

// GET /api/visitors?range=7d&bots=0 – where visitors come from (admin)
export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const client = db()
  if (!client) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })

  const range = (request.nextUrl.searchParams.get('range') || '7d') as Range
  const days = RANGES[range] ?? 7
  const includeBots = request.nextUrl.searchParams.get('bots') === '1'
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const rows: Visit[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let query = client
      .from('site_visits')
      .select('created_at, visitor_id, path, referrer, source, medium, utm_campaign, country, region, city, device, browser, os, is_bot')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (!includeBots) query = query.eq('is_bot', false)
    const { data, error } = await query
    if (error) {
      const missing = error.code === '42P01' || /site_visits/.test(error.message)
      return NextResponse.json({ error: missing ? 'Run supabase/migration-site-visits.sql to start logging visits.' : 'Couldn’t load visits' }, { status: 500 })
    }
    rows.push(...(data as Visit[]))
    if (!data || data.length < PAGE) break
  }

  // A visit is someone arriving; reloads that came from our own pages are not new arrivals
  const arrivals = rows.filter(v => v.medium !== 'internal')
  const visitors = new Set(arrivals.map(v => v.visitor_id).filter(Boolean))
  const botCount = includeBots ? rows.filter(v => v.is_bot).length : null

  // Visits over time, bucketed by hour for 24h and by day otherwise, in Abuja time
  const hourly = range === '24h'
  const bucketKey = (iso: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', ...(hourly ? { hour: '2-digit', hourCycle: 'h23' } : {}),
    }).formatToParts(new Date(iso))
    const get = (t: string) => parts.find(p => p.type === t)?.value || ''
    return hourly ? `${get('year')}-${get('month')}-${get('day')}T${get('hour')}` : `${get('year')}-${get('month')}-${get('day')}`
  }
  const buckets = new Map<string, { visits: number; people: Set<string> }>()
  const steps = hourly ? 24 : days
  for (let i = steps - 1; i >= 0; i--) {
    const t = new Date(Date.now() - i * (hourly ? 3600_000 : 86_400_000)).toISOString()
    buckets.set(bucketKey(t), { visits: 0, people: new Set() })
  }
  for (const v of arrivals) {
    const b = buckets.get(bucketKey(v.created_at))
    if (!b) continue
    b.visits++
    if (v.visitor_id) b.people.add(v.visitor_id)
  }

  const countries = tally(arrivals, v => v.country)
  return NextResponse.json({
    range,
    generatedAt: new Date().toISOString(),
    truncated: rows.length >= MAX_ROWS,
    totals: {
      visits: arrivals.length,
      visitors: visitors.size,
      pageLoads: rows.length,
      countries: new Set(arrivals.map(v => v.country).filter(Boolean)).size,
      bots: botCount,
    },
    series: [...buckets.entries()].map(([key, b]) => ({ key, visits: b.visits, visitors: b.people.size })),
    sources: tally(arrivals, v => v.source, 12).map(s => ({ ...s, medium: arrivals.find(v => v.source === s.name)?.medium || 'referral' })),
    mediums: tally(arrivals, v => v.medium as string, 8),
    campaigns: tally(arrivals, v => v.utm_campaign, 8),
    countries,
    cities: tally(arrivals, v => (v.city ? `${v.city}${v.country ? `, ${v.country}` : ''}` : null), 10),
    landing: tally(arrivals, v => v.path, 10),
    devices: tally(arrivals, v => v.device, 3),
    browsers: tally(arrivals, v => v.browser, 6),
    recent: arrivals.slice(0, 60).map(v => ({
      at: v.created_at,
      visitor: v.visitor_id?.slice(0, 8) || null,
      path: v.path,
      source: v.source,
      medium: v.medium,
      referrer: v.referrer,
      campaign: v.utm_campaign,
      country: v.country,
      city: v.city,
      region: v.region,
      device: v.device,
      browser: v.browser,
      os: v.os,
      bot: v.is_bot,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
