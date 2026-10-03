import { NextRequest, NextResponse } from 'next/server'
import { requireRole, hashPassword, serviceClient as db, ROLES, Role } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/users/:id – change name, role, active state or password (super admin)
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireRole('super_admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const client = db()
  if (!client) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as Role)) return NextResponse.json({ error: 'Choose a valid role' }, { status: 400 })
    update.role = body.role
  }
  if (typeof body.active === 'boolean') update.active = body.active
  if (body.password !== undefined) {
    if (String(body.password).length < 10) return NextResponse.json({ error: 'Use at least 10 characters', fields: { password: 'Use at least 10 characters.' } }, { status: 400 })
    update.password_hash = hashPassword(String(body.password))
  }
  if (auth.id === id && (update.role && update.role !== 'super_admin' || update.active === false)) {
    return NextResponse.json({ error: 'You can’t remove your own super admin access' }, { status: 400 })
  }
  const { data, error } = await client.from('admin_users').update(update).eq('id', id).select('id, email, name, role, active, last_login_at, created_at').single()
  if (error || !data) return NextResponse.json({ error: 'Couldn’t update the account' }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/users/:id (super admin)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole('super_admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (auth.id === id) return NextResponse.json({ error: 'You can’t delete your own account' }, { status: 400 })
  const client = db()
  if (!client) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })
  const { error } = await client.from('admin_users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Couldn’t delete the account' }, { status: 500 })
  return NextResponse.json({ success: true })
}
