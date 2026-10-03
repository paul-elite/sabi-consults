// Server-only authentication helpers.
//
// Sessions are a signed cookie (HMAC-SHA256), so they can't be forged by
// setting a cookie value in the browser. Passwords are hashed with scrypt.
//
// Roles, from most to least powerful:
//   super_admin  – everything, including branding and staff accounts
//   admin        – properties, inquiries, blog, team and contact settings
//   staff        – properties, inquiries, blog and team
//
// A "break-glass" super admin always exists from ADMIN_EMAIL / ADMIN_PASSWORD,
// so a fresh deployment can sign in before any accounts are created.
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { createClient as createSupabase } from '@supabase/supabase-js'

export type Role = 'super_admin' | 'admin' | 'staff'
export const ROLES: Role[] = ['super_admin', 'admin', 'staff']
const RANK: Record<Role, number> = { staff: 1, admin: 2, super_admin: 3 }

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

const COOKIE = 'sabi_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('Set SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to enable admin sign-in')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabase(url, key, { auth: { persistSession: false } })
}

/* ---------- passwords ---------- */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.startsWith('scrypt$')) return false
  const [, saltB64, hashB64] = stored.split('$')
  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/* ---------- sign in / out ---------- */
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase()

  // 1. Break-glass super admin from environment variables
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const envPassword = process.env.ADMIN_PASSWORD
  if (envEmail && envPassword && normalized === envEmail && safeEqual(password, envPassword)) {
    return { id: 'env', email: envEmail, name: 'Owner', role: 'super_admin' }
  }

  // 2. Staff accounts stored in the database
  const db = serviceClient()
  if (!db) return null
  const { data } = await db
    .from('admin_users')
    .select('id, email, name, role, password_hash, active')
    .eq('email', normalized)
    .maybeSingle()
  if (!data || data.active === false || !verifyPassword(password, data.password_hash)) return null
  await db.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', data.id)
  return { id: data.id, email: data.email, name: data.name, role: data.role as Role }
}

export async function startSession(user: SessionUser) {
  const payload = Buffer.from(
    JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role, exp: Date.now() + MAX_AGE * 1000 })
  ).toString('base64url')
  const store = await cookies()
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function endSession() {
  const store = await cookies()
  store.delete(COOKIE)
}

/* ---------- reading the session ---------- */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies()
    const raw = store.get(COOKIE)?.value
    if (!raw) return null
    const [payload, sig] = raw.split('.')
    if (!payload || !sig || !safeEqual(sig, sign(payload))) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!data.exp || data.exp < Date.now()) return null
    if (data.id === 'env') return { id: 'env', email: data.email, name: data.name, role: 'super_admin' }

    // Re-check the account so deactivation and role changes apply immediately
    const db = serviceClient()
    if (!db) return null
    const { data: row } = await db
      .from('admin_users')
      .select('id, email, name, role, active')
      .eq('id', data.id)
      .maybeSingle()
    if (!row || row.active === false) return null
    return { id: row.id, email: row.email, name: row.name, role: row.role as Role }
  } catch {
    return null
  }
}

export function hasRole(user: SessionUser | null, min: Role): boolean {
  return !!user && RANK[user.role] >= RANK[min]
}

/**
 * Use at the top of an API route:
 *   const auth = await requireRole('admin'); if (auth instanceof NextResponse) return auth
 */
export async function requireRole(min: Role = 'staff'): Promise<SessionUser | NextResponse> {
  if (!(await sameOrigin())) return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  if (!hasRole(user, min)) return NextResponse.json({ error: 'You don’t have permission to do this' }, { status: 403 })
  return user
}

/**
 * Blocks requests sent from other websites (cross-site request forgery).
 * Browsers always send Origin on POST/PUT/DELETE; it must match this site.
 */
export async function sameOrigin(): Promise<boolean> {
  const h = await headers()
  const origin = h.get('origin')
  if (!origin) return true // same-origin GETs and server-to-server calls
  const host = h.get('x-forwarded-host') || h.get('host')
  try { return new URL(origin).host === host } catch { return false }
}
