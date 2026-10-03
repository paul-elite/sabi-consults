import { NextRequest, NextResponse } from 'next/server'
import { getSession, serviceClient as db, sameOrigin, hashPassword, verifyPassword } from '@/lib/auth'

// PUT /api/staff/password – change current user's password
export async function PUT(request: NextRequest) {
  if (!(await sameOrigin())) {
    return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  }

  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  }

  // Env user can't change password
  if (user.id === 'env') {
    return NextResponse.json({ error: 'Password is managed via environment variables' }, { status: 403 })
  }

  const client = db()
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { currentPassword, newPassword } = body

  if (!currentPassword) {
    return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
  }

  if (!newPassword || newPassword.length < 10) {
    return NextResponse.json({ error: 'New password must be at least 10 characters' }, { status: 400 })
  }

  // Verify current password
  const { data: userData } = await client
    .from('admin_users')
    .select('password_hash')
    .eq('id', user.id)
    .single()

  if (!userData || !verifyPassword(currentPassword, userData.password_hash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  // Update password
  const { error } = await client
    .from('admin_users')
    .update({ password_hash: hashPassword(newPassword) })
    .eq('id', user.id)

  if (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
