import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/email/config'

// Active staff, for "assign to" menus
export async function GET() {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const { data } = await db().from('admin_users').select('id, name, email, role').eq('active', true).order('name')
  return NextResponse.json(data || [])
}
