// Server-only authentication helpers.
//
// Sessions are a signed cookie (HMAC-SHA256), so they can't be forged by
// setting a cookie value in the browser. Passwords are hashed with scrypt.
// Each session carries a fingerprint of the account's password hash, so
// changing or resetting a password signs out every other session at once.
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
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
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

const PROD = process.env.NODE_ENV === 'production'
// __Host- cookies must be Secure, path=/ and host-only, so a subdomain can't plant or overwrite them
const COOKIE = PROD ? '__Host-sabi_session' : 'sabi_session'
const MAX_AGE = 60 * 60 * 24 // 24 hours
export const MAX_PASSWORD = 256 // scrypt cost grows with input; cap it

let warned = false
function secret(): Buffer {
  const own = process.env.SESSION_SECRET
  if (own && own.length >= 32) return Buffer.from(own)
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!fallback) throw new Error('Set SESSION_SECRET (32+ characters) to enable admin sign-in')
  if (!warned) { warned = true; console.warn('SESSION_SECRET is not set (or under 32 characters); deriving the session key from the service role key.') }
  // Domain-separated so the raw service key is never used directly as the HMAC key
  return createHash('sha256').update('sabi-session-v1:' + fallback).digest()
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Short fingerprint of a credential; changes whenever the password does. */
function credentialTag(credential: string): string {
  return createHmac('sha256', secret()).update('cred:' + credential).digest('base64url').slice(0, 22)
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

// Verified against when an email has no account, so a miss takes as long as a wrong password
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'))

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (password.length > MAX_PASSWORD) return false
  if (!stored || !stored.startsWith('scrypt$')) { verifyPassword(password, DUMMY_HASH); return false }
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
export async function authenticate(email: string, password: string): Promise<{ user: SessionUser; credential: string } | null> {
  const normalized = email.trim().toLowerCase()
  if (password.length > MAX_PASSWORD || normalized.length > 254) return null

  // 1. Break-glass super admin from environment variables
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const envPassword = process.env.ADMIN_PASSWORD
  if (envEmail && envPassword && normalized === envEmail && safeEqual(password, envPassword)) {
    return { user: { id: 'env', email: envEmail, name: 'Owner', role: 'super_admin' }, credential: envPassword }
  }

  // 2. Staff accounts stored in the database
  const db = serviceClient()
  if (!db) return null
  const { data } = await db
    .from('admin_users')
    .select('id, email, name, role, password_hash, active')
    .eq('email', normalized)
    .maybeSingle()
  const ok = verifyPassword(password, data?.password_hash)
  if (!data || data.active === false || !ok) return null
  await db.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', data.id)
  return { user: { id: data.id, email: data.email, name: data.name, role: data.role as Role }, credential: data.password_hash }
}

/** `credential` is the account's stored password hash (or the env password for the owner account). */
export async function startSession(user: SessionUser, credential: string) {
  const payload = Buffer.from(
    JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role, v: credentialTag(credential), exp: Date.now() + MAX_AGE * 1000 })
  ).toString('base64url')
  const store = await cookies()
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: PROD,
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function endSession() {
  const store = await cookies()
  // Expire with the same attributes it was set with; browsers ignore a __Host- cookie change without Secure
  store.set(COOKIE, '', { httpOnly: true, secure: PROD, sameSite: 'strict', maxAge: 0, path: '/' })
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
    if (!data.exp || data.exp < Date.now() || typeof data.v !== 'string') return null
    if (data.id === 'env') {
      // Owner session ends if the env credentials are removed or rotated
      const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
      const envPassword = process.env.ADMIN_PASSWORD
      if (!envEmail || !envPassword || data.email !== envEmail || !safeEqual(data.v, credentialTag(envPassword))) return null
      return { id: 'env', email: envEmail, name: data.name, role: 'super_admin' }
    }

    // Re-check the account so deactivation and role changes apply immediately
    const db = serviceClient()
    if (!db) return null
    const { data: row } = await db
      .from('admin_users')
      .select('id, email, name, role, active, password_hash')
      .eq('id', data.id)
      .maybeSingle()
    if (!row || row.active === false || !row.password_hash || !safeEqual(data.v, credentialTag(row.password_hash))) return null
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
  if (!origin) {
    // Browsers that omit Origin still send Fetch Metadata; refuse anything another site started
    const site = h.get('sec-fetch-site')
    return !site || site === 'same-origin' || site === 'none'
  }
  const host = h.get('x-forwarded-host') || h.get('host')
  try { return new URL(origin).host === host } catch { return false }
}
