// Resend API (https://resend.com/docs/api-reference). Called only from the server.
import { createHmac, timingSafeEqual } from 'crypto'

export interface OutgoingEmail {
  from: string
  to: string
  replyTo?: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
  tags?: { name: string; value: string }[]
  idempotencyKey: string
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; retryable: boolean; error: string }

export const providerConfigured = () => !!process.env.RESEND_API_KEY

export async function sendViaResend(email: OutgoingEmail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, retryable: true, error: 'Email provider not configured (RESEND_API_KEY is missing)' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // Resend returns the original result for a repeated key, so a retry can't send twice
        'Idempotency-Key': email.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: email.from, to: [email.to], subject: email.subject, html: email.html, text: email.text,
        reply_to: email.replyTo || undefined, headers: email.headers, tags: email.tags,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const body = await res.json().catch(() => ({})) as { id?: string; message?: string; name?: string }
    if (res.ok && body.id) return { ok: true, id: body.id }
    const error = `${res.status} ${body.name || ''} ${body.message || ''}`.trim()
    // 429 and 5xx are temporary; 4xx (bad address, unverified domain) won't fix themselves
    return { ok: false, retryable: res.status === 429 || res.status >= 500, error }
  } catch (err) {
    return { ok: false, retryable: true, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/** Domain verification status and the DNS records Resend wants (SPF, DKIM, MX for bounces). */
export async function resendDomains(): Promise<{ ok: boolean; domains?: unknown[]; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not set' }
  try {
    const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) })
    const body = await res.json().catch(() => ({})) as { data?: { id: string }[]; message?: string }
    if (!res.ok) return { ok: false, error: body.message || `HTTP ${res.status}` }
    const domains = await Promise.all((body.data || []).slice(0, 5).map(async d => {
      const r = await fetch(`https://api.resend.com/domains/${d.id}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) })
      return r.ok ? r.json() : d
    }))
    return { ok: true, domains }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Verifies a Resend webhook (Svix signing): HMAC-SHA256 of "id.timestamp.body"
 * with the base64 secret after "whsec_". Rejects anything older than 5 minutes.
 */
export function verifyResendWebhook(body: string, headers: Headers): { ok: true; id: string } | { ok: false; error: string } {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return { ok: false, error: 'RESEND_WEBHOOK_SECRET is not set' }
  const id = headers.get('svix-id') || headers.get('webhook-id')
  const ts = headers.get('svix-timestamp') || headers.get('webhook-timestamp')
  const sigs = headers.get('svix-signature') || headers.get('webhook-signature')
  if (!id || !ts || !sigs) return { ok: false, error: 'Missing signature headers' }
  const age = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(age) || age > 300) return { ok: false, error: 'Stale timestamp' }
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest()
  const match = sigs.split(' ').some(part => {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) return false
    const given = Buffer.from(sig, 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
  return match ? { ok: true, id } : { ok: false, error: 'Bad signature' }
}
