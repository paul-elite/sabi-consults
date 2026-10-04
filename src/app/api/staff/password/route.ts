import { NextRequest, NextResponse } from 'next/server'
import { getSession, serviceClient as db, sameOrigin, hashPassword, verifyPassword, startSession, MAX_PASSWORD } from '@/lib/auth'
import { rateLimit, readJson } from '@/lib/rate-limit'

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

  // Stops a hijacked session from brute-forcing the current password
  if (!rateLimit(`pw-change:${user.id}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  const body = await readJson(request, 4 * 1024)
  if (body instanceof NextResponse) return body
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword) {
    return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
  }

  if (newPassword.length < 10 || newPassword.length > MAX_PASSWORD) {
    return NextResponse.json({ error: 'New password must be 10 to 256 characters' }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'Choose a password different from your current one' }, { status: 400 })
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

  // Update password; the new hash invalidates every other session for this account
  const newHash = hashPassword(newPassword)
  const { error } = await client
    .from('admin_users')
    .update({ password_hash: newHash })
    .eq('id', user.id)

  if (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }

  // Keep this browser signed in
  await startSession(user, newHash)

  return NextResponse.json({ success: true })
}
