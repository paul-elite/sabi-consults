import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { registrationToken } from '@/lib/staff-invite'

// GET /api/users/invite – the private staff sign-up link (super admin)
export async function GET() {
  const auth = await requireRole('super_admin')
  if (auth instanceof NextResponse) return auth
  const token = registrationToken()
  return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } })
}
