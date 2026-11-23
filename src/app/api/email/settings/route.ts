import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { cleanText } from '@/lib/sanitize'
import { clearSettingsCache, db, getEmailSettings, isEmail, providerStatus, siteUrl } from '@/lib/email/config'
import { resendDomains } from '@/lib/email/provider'
import { bad } from '@/lib/email/api'

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const client = db()
  const settings = await getEmailSettings(true)
  const [scoring, magnets, worker, webhook] = await Promise.all([
    client.from('scoring_rules').select('*').order('sort_order'),
    client.from('lead_magnets').select('*').order('sort_order'),
    client.from('worker_runs').select('started_at, finished_at, ok, error, stats').eq('job', 'worker').order('started_at', { ascending: false }).limit(5),
    client.from('site_settings').select('value').eq('key', 'email_last_webhook_at').maybeSingle(),
  ])
  const withDomains = request.nextUrl.searchParams.get('domains') === '1'
  return NextResponse.json({
    settings,
    provider: providerStatus(),
    endpoints: { webhook: `${siteUrl()}/api/email/webhooks/resend`, worker: `${siteUrl()}/api/email/worker` },
    domains: withDomains ? await resendDomains() : null,
    scoring: scoring.data || [],
    leadMagnets: magnets.data || [],
    workerRuns: worker.data || [],
    lastWebhookAt: webhook.data?.value || null,
  })
}

const KEYS: Record<string, (v: unknown) => string | null> = {
  senderName: v => cleanText(v, 80) || null,
  senderAddress: v => { const s = cleanText(v, 200).toLowerCase(); return s === '' ? '' : isEmail(s) ? s : null },
  replyTo: v => { const s = cleanText(v, 200).toLowerCase(); return s === '' ? '' : isEmail(s) ? s : null },
  doubleOptIn: v => (typeof v === 'boolean' ? String(v) : null),
  trackOpens: v => (typeof v === 'boolean' ? String(v) : null),
  batchSize: v => (Number(v) >= 1 && Number(v) <= 200 ? String(Math.round(Number(v))) : null),
  dailyLimit: v => (Number(v) >= 1 && Number(v) <= 100000 ? String(Math.round(Number(v))) : null),
  unassignedHours: v => (Number(v) >= 0.25 && Number(v) <= 168 ? String(Number(v)) : null),
  reminderHours: v => (Number(v) >= 1 && Number(v) <= 168 ? String(Number(v)) : null),
  dayOfHours: v => (Number(v) >= 0.5 && Number(v) <= 24 ? String(Number(v)) : null),
  reactivationDays: v => (Number(v) >= 30 && Number(v) <= 730 ? String(Math.round(Number(v))) : null),
  notifyRecipients: v => {
    const list = String(v ?? '').split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
    return list.every(isEmail) ? list.join(', ') : null
  },
}
const COLUMN: Record<string, string> = {
  senderName: 'email_sender_name', senderAddress: 'email_sender_address', replyTo: 'email_reply_to', doubleOptIn: 'email_double_opt_in',
  trackOpens: 'email_tracking_opens', batchSize: 'email_batch_size', dailyLimit: 'email_daily_limit', unassignedHours: 'email_unassigned_hours',
  reminderHours: 'email_reminder_hours', dayOfHours: 'email_dayof_hours', reactivationDays: 'email_reactivation_days', notifyRecipients: 'email_notify_recipients',
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const rows: { key: string; value: string }[] = []
  for (const [k, v] of Object.entries(raw.settings || {})) {
    if (!KEYS[k]) continue
    const value = KEYS[k](v)
    if (value === null) return bad(`Check the value for ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
    rows.push({ key: COLUMN[k], value })
  }
  if (rows.length) {
    const { error } = await client.from('site_settings').upsert(rows.map(r => ({ ...r, updated_at: new Date().toISOString() })))
    if (error) return bad(error.message, 500)
    clearSettingsCache()
  }
  // Lead scoring rules
  if (Array.isArray(raw.scoring)) {
    for (const r of raw.scoring as Record<string, unknown>[]) {
      const points = Math.round(Number(r.points))
      if (!Number.isFinite(points) || points < -100 || points > 100) return bad('Scores must be between -100 and 100')
      const max = r.max_points === null || r.max_points === '' ? null : Math.round(Number(r.max_points))
      await client.from('scoring_rules').update({ points, max_points: Number.isFinite(max as number) ? max : null, active: r.active !== false }).eq('signal', String(r.signal))
    }
    // Rescore leads active in the last 90 days
    const { data: leads } = await client.from('leads').select('id').gte('last_activity_at', new Date(Date.now() - 90 * 86400_000).toISOString()).limit(2000)
    for (const l of leads || []) await client.rpc('calculate_lead_score', { p_lead_id: l.id })
  }
  return NextResponse.json({ ok: true })
}
