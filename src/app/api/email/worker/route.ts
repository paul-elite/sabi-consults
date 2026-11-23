import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { requireRole } from '@/lib/auth'
import { runWorker } from '@/lib/email/worker'

export const maxDuration = 60

function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') || ''
  if (!secret || secret.length < 16) return false
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Called every minute by Supabase pg_cron (and daily by Vercel Cron as a backup)
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runWorker({ source: request.headers.get('x-worker-source') || 'cron' })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

export async function POST(request: NextRequest) {
  // pg_net sends a POST; admins can also press "Run now" in Email settings
  if (!cronAuthorized(request)) {
    const auth = await requireRole('admin')
    if (auth instanceof NextResponse) return auth
  }
  const result = await runWorker({ source: cronAuthorized(request) ? 'cron' : 'admin', budgetMs: 40_000 })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
