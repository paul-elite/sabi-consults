import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/store'
import { cookies } from 'next/headers'

// POST login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const isValid = validateAdmin(email, password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// DELETE logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return NextResponse.json({ success: true })
}

// GET check session
export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (session && session.value === 'authenticated') {
    // Return token for API calls that need authentication
    const token = Buffer.from(
      `${process.env.ADMIN_EMAIL}:${process.env.ADMIN_PASSWORD}`
    ).toString('base64')
    return NextResponse.json({ authenticated: true, token })
  }

  return NextResponse.json({ authenticated: false })
}
