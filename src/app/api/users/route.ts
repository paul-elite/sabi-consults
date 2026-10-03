import { NextRequest, NextResponse } from 'next/server'
import { requireRole, hashPassword, serviceClient as db, ROLES, Role } from '@/lib/auth'

const PUBLIC_FIELDS = 'id, email, name, role, active, last_login_at, created_at'

// GET /api/users – list staff accounts (super admin)
export async function GET() {
  const auth = await requireRole('super_admin')
  if (auth instanceof NextResponse) return auth
  const client = db()
  if (!client) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })
  const { data, error } = await client.from('admin_users').select(PUBLIC_FIELDS).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: 'Couldn’t load accounts. Run supabase/setup.sql.' }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/users – create an account (super admin)
export async function POST(request: NextRequest) {
  const auth = await requireRole('super_admin')
  if (auth instanceof NextResponse) return auth
  const client = db()
  if (!client) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })

  const { name, email, role, password } = await request.json()
  const fields: Record<string, string> = {}
  if (!name?.trim()) fields.name = 'Enter their name.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) fields.email = 'Enter an email like name@company.com.'
  if (!ROLES.includes(role as Role)) fields.role = 'Choose a role.'
  if (!password || String(password).length < 10) fields.password = 'Use at least 10 characters.'
  if (Object.keys(fields).length) return NextResponse.json({ error: 'Check the highlighted fields', fields }, { status: 400 })

  const { data, error } = await client
    .from('admin_users')
    .insert({ name: name.trim(), email: String(email).trim().toLowerCase(), role, password_hash: hashPassword(password), active: true })
    .select(PUBLIC_FIELDS)
    .single()
  if (error) {
    const dup = error.code === '23505'
    return NextResponse.json({ error: dup ? 'An account with this email already exists' : 'Couldn’t create the account', fields: dup ? { email: 'Already in use.' } : undefined }, { status: dup ? 409 : 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
