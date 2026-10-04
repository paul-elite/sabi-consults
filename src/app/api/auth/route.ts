import { NextRequest, NextResponse } from 'next/server'
import { authenticate, startSession, endSession, getSession, sameOrigin } from '@/lib/auth'
import { clientIp, isLimited, rateLimit, readJson, resetLimit } from '@/lib/rate-limit'

const TEN_MIN = 10 * 60 * 1000
const HOUR = 60 * 60 * 1000

// POST /api/auth – sign in
export async function POST(request: NextRequest) {
  if (!(await sameOrigin())) return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  try {
    const body = await readJson<{ email?: unknown; password?: unknown }>(request, 4 * 1024)
    if (body instanceof NextResponse) return body
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) {
      return NextResponse.json({ error: 'Enter your email and password' }, { status: 400 })
    }

    // Three limits: one IP guessing one account, one IP spraying many accounts,
    // and many IPs guessing one account.
    const ip = clientIp(request)
    const pairKey = `login:${ip}:${email}`
    const ipKey = `login-ip:${ip}`
    const emailKey = `login-email:${email}`
    if (isLimited(pairKey, 8, TEN_MIN) || isLimited(ipKey, 30, HOUR) || isLimited(emailKey, 25, HOUR)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429, headers: { 'Retry-After': '600' } })
    }

    const result = await authenticate(email, password)
    if (!result) {
      rateLimit(pairKey, 8, TEN_MIN)
      rateLimit(ipKey, 30, HOUR)
      rateLimit(emailKey, 25, HOUR)
      return NextResponse.json({ error: 'That email and password don’t match an active account' }, { status: 401 })
    }
    resetLimit(pairKey)
    await startSession(result.user, result.credential)
    return NextResponse.json({ success: true, user: result.user })
  } catch (e) {
    console.error('Sign-in error:', e)
    return NextResponse.json({ error: 'Sign-in failed. Check the server configuration.' }, { status: 500 })
  }
}

// DELETE /api/auth – sign out
export async function DELETE() {
  if (!(await sameOrigin())) return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  await endSession()
  return NextResponse.json({ success: true })
}

// GET /api/auth – who is signed in (never returns secrets)
export async function GET() {
  const user = await getSession()
  return NextResponse.json(user ? { authenticated: true, user } : { authenticated: false })
}
