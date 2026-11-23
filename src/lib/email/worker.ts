// The background worker. Called every minute by the scheduler (Supabase
// pg_cron → /api/email/worker), and also right after a form is submitted so
// confirmations go out within seconds. Every part is safe to run in parallel.
import { after } from 'next/server'
import { db, getEmailSettings } from './config'
import { processEvents, emitEvent } from './events'
import { processRuns } from './automations'
import { deliverDue, queueEmail } from './send'
import { audiencePage, cleanAudience, cleanExclude } from './audience'
import { ensureDefaults } from './store'

export interface WorkerResult { ok: boolean; ms: number; stats: Record<string, unknown>; error?: string }

export async function runWorker(opts: { budgetMs?: number; source?: string; periodic?: boolean } = {}): Promise<WorkerResult> {
  const started = Date.now()
  const deadline = started + (opts.budgetMs ?? 45_000)
  const client = db()
  const stats: Record<string, unknown> = { source: opts.source || 'manual' }
  const { data: hb } = await client.from('worker_runs').insert({ job: 'worker', stats }).select('id').single()
  try {
    await ensureDefaults()
    stats.events = await processEvents(deadline)
    stats.runs = await processRuns(deadline)
    if (opts.periodic !== false) stats.periodic = await periodicJobs(deadline)
    stats.campaigns = await expandCampaigns(deadline)
    stats.delivery = await deliverDue({ deadline })
    const ms = Date.now() - started
    if (hb) await client.from('worker_runs').update({ finished_at: new Date().toISOString(), ok: true, stats: { ...stats, ms } }).eq('id', hb.id)
    // Keep the heartbeat table small
    if (Math.random() < 0.02) await client.from('worker_runs').delete().eq('job', 'worker').lt('started_at', new Date(Date.now() - 14 * 86400_000).toISOString())
    return { ok: true, ms, stats }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('worker failed', msg)
    if (hb) await client.from('worker_runs').update({ finished_at: new Date().toISOString(), ok: false, error: msg, stats }).eq('id', hb.id)
    return { ok: false, ms: Date.now() - started, stats, error: msg }
  }
}

/**
 * Runs a short worker pass after the response has been sent, so the visitor
 * never waits for email. If it doesn't finish, the scheduled worker will.
 */
export function kickWorker(source: string) {
  try {
    after(async () => { await runWorker({ budgetMs: 20_000, source, periodic: false }) })
  } catch {
    // Outside a request (e.g. in a script): the scheduled worker will pick it up
  }
}

/* ---------------------------------------------------------------- campaigns */

async function expandCampaigns(deadline: number) {
  const client = db()
  const now = new Date().toISOString()
  let queued = 0
  // Scheduled campaigns whose time has come start sending
  await client.from('campaigns').update({ status: 'sending', started_at: now }).eq('status', 'scheduled').lte('scheduled_at', now)
  const { data: sending } = await client.from('campaigns').select('*').eq('status', 'sending')
  for (const c of sending || []) {
    if (c.expand_cursor !== 'done') {
      let cursor: string | null = c.expand_cursor || null
      while (Date.now() < deadline - 8_000) {
        const page = await audiencePage(client, cleanAudience(c.audience), cleanExclude(c.exclude), cursor)
        for (const r of page.rows) {
          await queueEmail({
            to: r.email, toName: r.name, contactId: r.id, templateKey: c.template_key, category: 'marketing',
            context: { campaign_id: c.id, property_ids: c.property_ids || [] },
            idempotencyKey: `campaign:${c.id}:${r.id}`, campaignId: c.id, createdBy: c.created_by,
          })
          queued++
        }
        const { count } = await client.from('email_messages').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id)
        const done = page.scanned < 500 || !page.last
        cursor = done ? 'done' : page.last
        await client.from('campaigns').update({ expand_cursor: cursor, recipient_count: count || 0 }).eq('id', c.id)
        if (done) break
      }
      if (cursor !== 'done') continue
    }
    const { count: pending } = await client.from('email_messages').select('id', { count: 'exact', head: true })
      .eq('campaign_id', c.id).in('status', ['queued', 'sending'])
    if (!pending) await client.from('campaigns').update({ status: 'sent', finished_at: new Date().toISOString() }).eq('id', c.id).eq('status', 'sending')
  }
  return { queued }
}

/* ------------------------------------------------------------ periodic jobs */

async function claimSlot(key: string): Promise<boolean> {
  const { error } = await db().from('worker_runs').insert({ job: key.split(':')[0], run_key: key, finished_at: new Date().toISOString(), ok: true })
  return !error
}

const lagosNow = () => new Date(Date.now() + 60 * 60_000) // Abuja is UTC+1 all year
const dayKey = () => lagosNow().toISOString().slice(0, 10)

async function periodicJobs(deadline: number) {
  const out: Record<string, unknown> = {}
  // Every 15 minutes: leads nobody has picked up, inspections nobody updated
  const t = lagosNow()
  const quarter = `${t.toISOString().slice(0, 13)}:${Math.floor(t.getUTCMinutes() / 15)}`
  if (await claimSlot(`quarter:${quarter}`)) {
    out.unassigned = await unassignedLeadAlerts()
    out.missed = await missedInspections()
  }
  // Once a day, after 8am in Abuja
  if (lagosNow().getUTCHours() >= 8 && Date.now() < deadline - 10_000 && await claimSlot(`daily:${dayKey()}`)) {
    out.birthdays = await birthdays()
    out.anniversaries = await anniversaries()
    out.reactivation = await reactivation()
    if (lagosNow().getUTCDay() === 1) out.digest = await weeklyDigest()
    // Keep processed events for 90 days
    await db().from('app_events').delete().eq('status', 'processed').lt('created_at', new Date(Date.now() - 90 * 86400_000).toISOString())
  }
  return out
}

async function unassignedLeadAlerts() {
  const client = db()
  const s = await getEmailSettings()
  const cutoff = new Date(Date.now() - s.unassignedHours * 3600_000).toISOString()
  const { data } = await client.from('leads').select('id, name').is('assigned_to', null).is('unassigned_alert_at', null)
    .in('status', ['new']).lt('created_at', cutoff).gt('created_at', new Date(Date.now() - 14 * 86400_000).toISOString()).limit(50)
  const { resolveRecipients } = await import('./automations')
  const team = await resolveRecipients('team', { contact_id: null, context: {} })
  for (const l of data || []) {
    for (const r of team) {
      await queueEmail({
        to: r.email, templateKey: 'internal_unassigned', category: 'internal',
        context: { lead_id: l.id, vars: { hours: String(s.unassignedHours) } }, idempotencyKey: `unassigned:${l.id}:${r.email}`,
      })
    }
    await client.from('leads').update({ unassigned_alert_at: new Date().toISOString() }).eq('id', l.id)
  }
  return (data || []).length
}

async function missedInspections() {
  const client = db()
  const { data } = await client.from('viewing_requests').select('id, lead_id, property_id, contact_id')
    .eq('status', 'confirmed').is('missed_alert_at', null)
    .lt('confirmed_datetime', new Date(Date.now() - 3 * 3600_000).toISOString())
    .gt('confirmed_datetime', new Date(Date.now() - 7 * 86400_000).toISOString()).limit(50)
  for (const v of data || []) {
    await emitEvent('inspection.missed', { viewing_id: v.id, lead_id: v.lead_id, property_id: v.property_id, contact_id: v.contact_id, subject_key: `missed:${v.id}` }, `inspection.missed:${v.id}`)
    await client.from('viewing_requests').update({ missed_alert_at: new Date().toISOString() }).eq('id', v.id)
  }
  return (data || []).length
}

async function birthdays() {
  const client = db()
  const now = lagosNow()
  const md = `-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  const { data } = await client.from('contacts').select('id, email, name, birthday')
    .not('birthday', 'is', null).eq('marketing_status', 'subscribed').eq('suppressed', false).is('archived_at', null).limit(5000)
  let n = 0
  for (const c of (data || []).filter(c => String(c.birthday).endsWith(md))) {
    await queueEmail({ to: c.email, toName: c.name, contactId: c.id, templateKey: 'birthday', category: 'marketing', idempotencyKey: `birthday:${c.id}:${now.getUTCFullYear()}` })
    n++
  }
  return n
}

async function anniversaries() {
  const client = db()
  const now = lagosNow()
  const md = `-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  const { data } = await client.from('transactions').select('id, contact_id, property_id, completed_at').eq('stage', 'completed').not('completed_at', 'is', null).limit(5000)
  let n = 0
  for (const t of data || []) {
    const done = new Date(Date.parse(t.completed_at) + 60 * 60_000)
    const years = now.getUTCFullYear() - done.getUTCFullYear()
    if (years < 1 || !t.contact_id || done.toISOString().slice(5, 10) !== md.slice(1)) continue
    const { data: c } = await client.from('contacts').select('id, email, name').eq('id', t.contact_id).maybeSingle()
    if (!c) continue
    await queueEmail({
      to: c.email, toName: c.name, contactId: c.id, templateKey: 'purchase_anniversary', category: 'marketing',
      context: { property_id: t.property_id, transaction_id: t.id, vars: { years: `${years} year${years > 1 ? 's' : ''}` } },
      idempotencyKey: `anniversary:${t.id}:${now.getUTCFullYear()}`,
    })
    n++
  }
  return n
}

async function reactivation() {
  const client = db()
  const s = await getEmailSettings()
  const cutoff = new Date(Date.now() - s.reactivationDays * 86400_000).toISOString()
  // Subscribed, had at least one email, no click/engagement since the cutoff, not nudged in the last 6 months
  const { data } = await client.from('contacts').select('id, email, name, last_engaged_at, reactivation_sent_at, created_at')
    .eq('marketing_status', 'subscribed').eq('suppressed', false).is('archived_at', null)
    .lt('created_at', cutoff).not('last_emailed_at', 'is', null).limit(1000)
  const sixMonths = Date.now() - 180 * 86400_000
  let n = 0
  for (const c of data || []) {
    if (c.last_engaged_at && c.last_engaged_at > cutoff) continue
    if (c.reactivation_sent_at && Date.parse(c.reactivation_sent_at) > sixMonths) continue
    await queueEmail({
      to: c.email, toName: c.name, contactId: c.id, templateKey: 'reactivation', category: 'marketing',
      context: { properties_mode: 'match' }, idempotencyKey: `reactivation:${c.id}:${dayKey().slice(0, 7)}`,
    })
    await client.from('contacts').update({ reactivation_sent_at: new Date().toISOString() }).eq('id', c.id)
    if (++n >= 200) break
  }
  return n
}

async function weeklyDigest() {
  const client = db()
  const since = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { count } = await client.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'available').gte('created_at', since)
  if (!count) return 0
  const { data } = await client.from('contacts').select('id, email, name').eq('marketing_status', 'subscribed')
    .eq('frequency', 'weekly').eq('suppressed', false).is('archived_at', null).limit(5000)
  for (const c of data || []) {
    // The send step skips anyone with no matching new listings
    await queueEmail({
      to: c.email, toName: c.name, contactId: c.id, templateKey: 'weekly_digest', category: 'marketing',
      context: { properties_mode: 'recent', since }, idempotencyKey: `digest:${c.id}:${dayKey()}`,
    })
  }
  return (data || []).length
}
