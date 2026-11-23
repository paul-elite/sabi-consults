import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db, getEmailSettings, providerStatus } from '@/lib/email/config'
import { parseRange } from '@/lib/email/api'
import { ensureDefaults } from '@/lib/email/store'

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  await ensureDefaults()
  const client = db()
  const { from, to } = parseRange(request.nextUrl.searchParams)
  const head = { count: 'exact' as const, head: true }
  const [analytics, total, subscribed, pending, unsubscribed, suppressed, queued, failed, worker, settings, webhook, recent, failedRuns] = await Promise.all([
    client.rpc('email_analytics', { p_from: from.toISOString(), p_to: to.toISOString(), p_campaign: null }),
    client.from('contacts').select('id', head).is('archived_at', null),
    client.from('contacts').select('id', head).eq('marketing_status', 'subscribed').eq('suppressed', false).is('archived_at', null),
    client.from('contacts').select('id', head).eq('marketing_status', 'pending'),
    client.from('contacts').select('id', head).eq('marketing_status', 'unsubscribed'),
    client.from('contacts').select('id', head).eq('suppressed', true),
    client.from('email_messages').select('id', head).in('status', ['queued', 'sending']),
    client.from('email_messages').select('id', head).eq('status', 'failed').gte('created_at', from.toISOString()),
    client.from('worker_runs').select('started_at, finished_at, ok, error, stats').eq('job', 'worker').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    getEmailSettings(true),
    client.from('site_settings').select('value').eq('key', 'email_last_webhook_at').maybeSingle(),
    client.from('email_messages').select('id, to_email, category, template_key, subject, status, status_reason, created_at, sent_at').order('created_at', { ascending: false }).limit(12),
    client.from('automation_runs').select('id', head).eq('status', 'failed'),
  ])
  if (analytics.error) return NextResponse.json({ error: analytics.error.message }, { status: 500 })
  const { data: held } = await client.from('email_messages').select('status_reason').eq('status', 'queued').like('status_reason', 'Waiting:%').limit(1).maybeSingle()
  return NextResponse.json({
    range: { from, to },
    analytics: analytics.data,
    audience: { total: total.count || 0, subscribed: subscribed.count || 0, pending: pending.count || 0, unsubscribed: unsubscribed.count || 0, suppressed: suppressed.count || 0 },
    queue: { pending: queued.count || 0, failed: failed.count || 0, failedRuns: failedRuns.count || 0, heldReason: held?.status_reason || null },
    health: {
      ...providerStatus(),
      senderAddress: settings.senderAddress || null,
      lastWorker: worker.data || null,
      lastWebhookAt: webhook.data?.value || null,
    },
    recent: recent.data || [],
  })
}
