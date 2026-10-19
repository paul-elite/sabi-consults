// Remembers, in this browser only, that someone has used the staff portal before,
// so /admin can open on "Log in" instead of "Create account".
// It holds a name and email for the greeting, never a token. Access is still
// decided by the session cookie on the server.

const KEY = 'sabi.staff'

export interface KnownStaff {
  name: string
  email: string
}

export function knownStaff(): KnownStaff | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    return v && typeof v.email === 'string' ? { name: typeof v.name === 'string' ? v.name : '', email: v.email } : null
  } catch {
    return null
  }
}

export function rememberStaff(user: { name?: string; email: string }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name: user.name || '', email: user.email }))
  } catch {
    // Storage blocked (private mode): the portal just opens on "Create account"
  }
}

export function forgetStaff() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
