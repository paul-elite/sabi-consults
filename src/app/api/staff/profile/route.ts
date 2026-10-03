import { NextRequest, NextResponse } from 'next/server'
import { getSession, serviceClient as db, sameOrigin } from '@/lib/auth'

// GET /api/staff/profile – get current user's profile
export async function GET() {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  }

  // Env user has limited profile
  if (user.id === 'env') {
    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: '',
      bio: '',
      image: null,
    })
  }

  const client = db()
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data, error } = await client
    .from('admin_users')
    .select('name, email, phone, bio, image')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT /api/staff/profile – update current user's profile
export async function PUT(request: NextRequest) {
  if (!(await sameOrigin())) {
    return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  }

  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  }

  // Env user can't update profile
  if (user.id === 'env') {
    return NextResponse.json({ error: 'Profile is managed via environment variables' }, { status: 403 })
  }

  const client = db()
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { name, phone, bio, image } = body

  if (!name?.trim() || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }

  const { data, error } = await client
    .from('admin_users')
    .update({
      name: name.trim(),
      phone: phone?.trim() || null,
      bio: bio?.trim() || null,
      image: image || null,
    })
    .eq('id', user.id)
    .select('name, email, phone, bio, image')
    .single()

  if (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json(data)
}
