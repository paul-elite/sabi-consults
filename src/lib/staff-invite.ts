import { timingSafeEqual } from 'crypto'

/** The invite secret from STAFF_REGISTRATION_TOKEN, or null when self sign-up is closed. */
export function registrationToken(): string | null {
  const token = process.env.STAFF_REGISTRATION_TOKEN?.trim()
  return token && token.length >= 16 ? token : null
}

export function validInvite(given: unknown): boolean {
  const token = registrationToken()
  if (!token || typeof given !== 'string') return false
  const a = Buffer.from(given), b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}
