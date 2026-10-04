import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, serviceClient as db, sameOrigin, MAX_PASSWORD } from '@/lib/auth'
import { cleanText } from '@/lib/sanitize'
import { clientIp, rateLimit, readJson } from '@/lib/rate-limit'
import { isStorageImageUrl } from '@/lib/storage-url'
import { validInvite } from '@/lib/staff-invite'

// POST /api/staff/register – self-registration for staff
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!(await sameOrigin())) {
    return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  }

  if (!rateLimit(`register:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many sign-up attempts. Try again later.' }, { status: 429 })
  }

  const client = db()
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await readJson(request, 16 * 1024)
  if (body instanceof NextResponse) return body

  // Only people holding the private link from the Staff accounts page can sign up
  if (!validInvite(body.invite)) {
    return NextResponse.json({ error: 'This sign-up link is invalid or has expired. Ask an admin for a new one.' }, { status: 403 })
  }

  const name = cleanText(body.name, 120)
  const email = cleanText(body.email, 254).toLowerCase()
  const phone = cleanText(body.phone, 40)
  const position = cleanText(body.position, 120)
  const dateOfBirth = typeof body.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth) ? body.dateOfBirth : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
  const image = typeof body.image === 'string' && isStorageImageUrl(body.image) ? body.image : null

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

  if (password.length < 10 || password.length > MAX_PASSWORD) {
    fields.password = 'Password must be 10 to 256 characters'
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
    image,
    role: 'staff',
    password_hash: hashPassword(password),
    active: false,
  })

  if (error) {
    console.error('Staff registration error:', error)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Account request submitted for admin review.' }, { status: 201 })
}
