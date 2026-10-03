import { NextRequest, NextResponse } from 'next/server'
import { authenticate, startSession, endSession, getSession, sameOrigin } from '@/lib/auth'

// Simple in-memory throttle: 8 attempts per 10 minutes per IP + email
const attempts = new Map<string, { n: number; until: number }>()

// POST /api/auth – sign in
export async function POST(request: NextRequest) {
  if (!(await sameOrigin())) return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Enter your email and password' }, { status: 400 })
    }
    const key = `${request.headers.get('x-forwarded-for') || 'ip'}:${String(email).toLowerCase()}`
    const now = Date.now()
    const a = attempts.get(key)
    if (a && a.n >= 8 && a.until > now) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
    }

    const user = await authenticate(String(email), String(password))
    if (!user) {
      attempts.set(key, { n: (a && a.until > now ? a.n : 0) + 1, until: now + 10 * 60 * 1000 })
      return NextResponse.json({ error: 'That email and password don’t match an active account' }, { status: 401 })
    }
    attempts.delete(key)
    await startSession(user)
    return NextResponse.json({ success: true, user })
  } catch (e) {
    console.error('Sign-in error:', e)
    return NextResponse.json({ error: 'Sign-in failed. Check the server configuration.' }, { status: 500 })
  }
}

// DELETE /api/auth – sign out
export async function DELETE() {
  await endSession()
  return NextResponse.json({ success: true })
}

// GET /api/auth – who is signed in (never returns secrets)
export async function GET() {
  const user = await getSession()
  return NextResponse.json(user ? { authenticated: true, user } : { authenticated: false })
}
