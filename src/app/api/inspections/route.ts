import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/email/config'

// GET inspections. Agents see the ones assigned to them; admins see all.
export async function GET(request: NextRequest) {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const p = request.nextUrl.searchParams
  let q = db().from('viewing_requests')
    .select('*, property:properties(id, title, district, address, images), lead:leads(id, name, status, score, quality), assignee:admin_users!viewing_requests_assigned_to_fkey(id, name)')
    .order('created_at', { ascending: false }).limit(300)
  const status = p.get('status')
  if (status) q = q.eq('status', status)
  if (p.get('view') === 'upcoming') q = q.eq('status', 'confirmed').gte('confirmed_datetime', new Date(Date.now() - 6 * 3600_000).toISOString())
  if (auth.role === 'staff') q = q.eq('assigned_to', auth.id)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
