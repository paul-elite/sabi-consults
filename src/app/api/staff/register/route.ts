import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, serviceClient as db, sameOrigin } from '@/lib/auth'

// POST /api/staff/register – self-registration for staff
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!(await sameOrigin())) {
    return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  }

  const client = db()
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { name, email, phone, dateOfBirth, position, password, confirmPassword, image } = body

  // Validate fields
  const fields: Record<string, string> = {}

  if (!name?.trim() || name.trim().length < 2) {
    fields.name = 'Enter your full name'
  }

  if (!dateOfBirth) {
    fields.dateOfBirth = 'Enter your date of birth'
  } else {
    const dob = new Date(dateOfBirth)
    const today = new Date()
    const age = today.getFullYear() - dob.getFullYear()
    if (age < 18 || age > 100) {
      fields.dateOfBirth = 'You must be at least 18 years old'
    }
  }

  if (!position?.trim()) {
    fields.position = 'Select or enter your position'
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) {
    fields.email = 'Enter a valid email address'
  }

  if (!phone?.trim() || phone.trim().length < 8) {
    fields.phone = 'Enter a valid phone number'
  }

  if (!password || password.length < 10) {
    fields.password = 'Password must be at least 10 characters'
  }

  if (password !== confirmPassword) {
    fields.confirmPassword = 'Passwords don\'t match'
  }

  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: 'Please fix the highlighted fields', fields }, { status: 400 })
  }

  // Check if email already exists
  const { data: existing } = await client
    .from('admin_users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: 'An account with this email already exists',
      fields: { email: 'This email is already registered' }
    }, { status: 409 })
  }

  // Create the account
  const { error } = await client.from('admin_users').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    date_of_birth: dateOfBirth,
    position: position.trim(),
    image: image || null,
    role: 'staff',
    password_hash: hashPassword(password),
    active: true,
  })

  if (error) {
    console.error('Staff registration error:', error)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
