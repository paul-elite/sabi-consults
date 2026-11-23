// Email configuration: secrets come from environment variables (server only),
// business settings come from site_settings so admins can change them.
// Server-only: imported by API routes and workers, never by client components.
import { serviceClient } from '@/lib/auth'

export type Db = NonNullable<ReturnType<typeof serviceClient>>

export function db(): Db {
  const client = serviceClient()
  if (!client) throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  return client
}

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (explicit) return explicit
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

export interface EmailSettings {
  senderName: string
  senderAddress: string
  replyTo: string
  doubleOptIn: boolean
  batchSize: number
  dailyLimit: number
  notifyRecipients: string[]
  unassignedHours: number
  reminderHours: number
  dayOfHours: number
  reactivationDays: number
  trackOpens: boolean
  // Business details reused in every footer
  brandName: string
  brandColor: string
  logoUrl: string
  companyEmail: string
  phone: string
  whatsapp: string
  address: string
}

const num = (v: string | undefined, d: number, min = 0, max = 1e9) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d
}

let cache: { at: number; value: EmailSettings } | null = null

export async function getEmailSettings(fresh = false): Promise<EmailSettings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.value
  const { data } = await db().from('site_settings').select('key, value')
  const s: Record<string, string> = {}
  for (const row of data || []) s[row.key] = row.value
  const value: EmailSettings = {
    senderName: s.email_sender_name || s.brand_name || 'Sabi Consults',
    senderAddress: s.email_sender_address || process.env.EMAIL_FROM_ADDRESS || '',
    replyTo: s.email_reply_to || process.env.EMAIL_REPLY_TO || s.email || '',
    doubleOptIn: (s.email_double_opt_in ?? 'true') !== 'false',
    batchSize: num(s.email_batch_size, 40, 1, 200),
    dailyLimit: num(s.email_daily_limit, 2000, 1, 100000),
    notifyRecipients: (s.email_notify_recipients || process.env.EMAIL_NOTIFY_RECIPIENTS || '')
      .split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    unassignedHours: num(s.email_unassigned_hours, 2, 0.25, 168),
    reminderHours: num(s.email_reminder_hours, 24, 1, 168),
    dayOfHours: num(s.email_dayof_hours, 3, 0.5, 24),
    reactivationDays: num(s.email_reactivation_days, 120, 30, 730),
    trackOpens: (s.email_tracking_opens ?? 'true') !== 'false',
    brandName: s.brand_name || 'Sabi Consults',
    brandColor: /^#[0-9a-f]{6}$/i.test(s.brand_color_primary || '') ? s.brand_color_primary : '#0055CC',
    logoUrl: s.brand_logo_url || '',
    companyEmail: s.email || '',
    phone: s.phone_number || '',
    whatsapp: (s.whatsapp_number || '').replace(/\D/g, ''),
    address: s.address || '',
  }
  cache = { at: Date.now(), value }
  return value
}

export function clearSettingsCache() { cache = null }

/** What is configured on the server. Values themselves are never sent to the browser. */
export function providerStatus() {
  return {
    provider: 'resend',
    apiKey: !!process.env.RESEND_API_KEY,
    webhookSecret: !!process.env.RESEND_WEBHOOK_SECRET,
    cronSecret: !!process.env.CRON_SECRET,
    siteUrl: siteUrl(),
    siteUrlExplicit: !!process.env.NEXT_PUBLIC_SITE_URL,
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v)
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

/** Short human reference like SC-7K4Q9P (no 0/O/1/I to avoid misreading). */
export function makeReference(prefix = 'SC'): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `${prefix}-${Array.from(bytes, b => alphabet[b % alphabet.length]).join('')}`
}
