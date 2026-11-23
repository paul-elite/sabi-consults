// Workflow engine: enrols people when a trigger event arrives, runs steps in
// order, pauses on waits, and ends runs early when an exit event happens.
// Every step writes a log row keyed (run, step), and every email uses the key
// "run:<run>:<step>", so a step can never run twice even if a worker restarts.
import { db, getEmailSettings } from './config'
import type { AppEventType, EventPayload } from './events'
import { LEAD_STATUS_RANK, type Condition, type Step } from './defaults'
import { agentFor, type MessageContext } from './context'
import { queueEmail } from './send'

export interface AutomationRow {
  id: string; key: string | null; name: string; trigger: string; conditions: Condition[]; steps: Step[]
  exit_on: string[]; active: boolean; allow_reenrol: boolean
}
interface RunRow {
  id: string; automation_id: string; subject_key: string; contact_id: string | null; lead_id: string | null
  context: MessageContext & Record<string, unknown>; status: string; step_index: number; attempts: number; started_at: string
}

/* ------------------------------------------------------------ exit mapping */

/** Which exit reasons an incoming event represents. */
function exitKeys(type: AppEventType, p: EventPayload): string[] {
  const keys: string[] = []
  if (type === 'inspection.requested' || type === 'inspection.booked' || type === 'lead.replied'
    || type === 'subscriber.unsubscribed' || type === 'property.unavailable') keys.push(type)
  if (type === 'lead.status_changed') {
    if (p.to === 'converted') keys.push('lead.converted')
    if (p.to === 'lost') keys.push('lead.lost')
  }
  if (type === 'transaction.created' || (type === 'transaction.stage_changed' && p.to !== 'cancelled')) keys.push('transaction.started')
  if (type === 'transaction.completed') keys.push('transaction.started', 'lead.converted')
  return keys
}

export async function handleEventForAutomations(ev: { id: string; type: AppEventType; payload: EventPayload }) {
  const client = db()
  const p = ev.payload || {}
  let exited = 0, enrolled = 0

  // 1. End runs this event makes irrelevant
  const keys = exitKeys(ev.type, p)
  if (keys.length) {
    const { data: autos } = await client.from('automations').select('id, exit_on').overlaps('exit_on', keys)
    const ids = (autos || []).map(a => a.id)
    if (ids.length) {
      let q = client.from('automation_runs').select('id, context, contact_id, lead_id').in('automation_id', ids).eq('status', 'active')
      if (ev.type === 'property.unavailable') q = q.eq('context->>property_id', String(p.property_id))
      // Unsubscribing (from marketing or everything) ends every nurturing run for that person
      else if (ev.type === 'subscriber.unsubscribed') q = q.eq('contact_id', String(p.contact_id))
      else if (p.lead_id && p.contact_id) q = q.or(`lead_id.eq.${p.lead_id},contact_id.eq.${p.contact_id}`)
      else if (p.lead_id) q = q.eq('lead_id', String(p.lead_id))
      else if (p.contact_id) q = q.eq('contact_id', String(p.contact_id))
      else q = q.eq('id', '00000000-0000-0000-0000-000000000000')
      const { data: runs } = await q
      const toExit = runs || []
      if (toExit.length) {
        await client.from('automation_runs').update({ status: 'exited', exit_reason: `Exit: ${ev.type}${p.to ? ` → ${p.to}` : ''}`, finished_at: new Date().toISOString() })
          .in('id', toExit.map(r => r.id)).eq('status', 'active')
        exited = toExit.length
      }
    }
  }

  // 2. Start matching workflows
  const { data: autos } = await client.from('automations').select('*').eq('trigger', ev.type).eq('active', true)
  for (const a of (autos || []) as AutomationRow[]) {
    const ctx: MessageContext & Record<string, unknown> = {
      lead_id: (p.lead_id as string) || null, property_id: (p.property_id as string) || null,
      inquiry_id: (p.inquiry_id as string) || null, viewing_id: (p.viewing_id as string) || null,
      transaction_id: (p.transaction_id as string) || null, referral_id: (p.referral_id as string) || null,
      enquiry_type: p.enquiry_type, property_type: p.property_type,
      vars: (p.vars as MessageContext['vars']) || undefined,
    }
    const contactId = (p.contact_id as string) || null
    const ok = await conditionsMet(a.conditions || [], { ...ctx, contact_id: contactId }, a.id, null)
    if (!ok.ok) continue
    const base = String(p.subject_key || ev.id)
    const subject = a.allow_reenrol ? `${base}:${ev.id}` : base
    const { error } = await client.from('automation_runs').insert({
      automation_id: a.id, subject_key: subject.slice(0, 300), contact_id: contactId, lead_id: ctx.lead_id,
      event_id: ev.id, context: ctx, next_run_at: new Date().toISOString(),
    })
    if (!error) enrolled++
    else if (error.code !== '23505') throw new Error(error.message)
  }
  return { enrolled, exited }
}

/** Admin "enrol manually" action. */
export async function enrolManually(automationId: string, contactId: string, context: MessageContext, actor: string) {
  const client = db()
  const { data: c } = await client.from('contacts').select('id, lead_id').eq('id', contactId).maybeSingle()
  if (!c) throw new Error('Contact not found')
  const { error, data } = await client.from('automation_runs').insert({
    automation_id: automationId, subject_key: `manual:${contactId}:${Date.now()}`, contact_id: contactId,
    lead_id: context.lead_id || c.lead_id || null, context: { lead_id: c.lead_id, ...context }, enrolled_by: actor,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

/* -------------------------------------------------------------- conditions */

type Ctx = MessageContext & Record<string, unknown> & { contact_id?: string | null }

async function conditionsMet(conds: Condition[], ctx: Ctx, automationId: string, runId: string | null): Promise<{ ok: boolean; failed?: Condition }> {
  for (const c of conds) if (!(await check(c, ctx, automationId, runId))) return { ok: false, failed: c }
  return { ok: true }
}

async function check(c: Condition, ctx: Ctx, automationId: string, runId: string | null): Promise<boolean> {
  const client = db()
  const vals = (c.values || []).map(String)
  const lead = async () => ctx.lead_id ? (await client.from('leads').select('status, last_contacted_at').eq('id', ctx.lead_id).maybeSingle()).data : null
  switch (c.check) {
    case 'has_property': return !!ctx.property_id
    case 'has_email': {
      if (!ctx.contact_id) return false
      const { data } = await client.from('contacts').select('email').eq('id', ctx.contact_id).maybeSingle()
      return !!data?.email
    }
    case 'property_available': {
      if (!ctx.property_id) return false
      const { data } = await client.from('properties').select('status').eq('id', ctx.property_id).maybeSingle()
      return data?.status === 'available'
    }
    case 'not_contacted': {
      const l = await lead()
      return !!l && l.status === 'new' && !l.last_contacted_at
    }
    case 'no_inspection_booked': {
      if (!ctx.lead_id) return true
      let q = client.from('viewing_requests').select('id', { count: 'exact', head: true }).eq('lead_id', ctx.lead_id).neq('status', 'cancelled')
      if (ctx.property_id) q = q.eq('property_id', ctx.property_id)
      const { count } = await q
      return !count
    }
    case 'lead_status_in': { const l = await lead(); return !!l && vals.includes(l.status) }
    case 'lead_status_not_in': { const l = await lead(); return !l || !vals.includes(l.status) }
    case 'enquiry_type_in': return vals.includes(String(ctx.enquiry_type || ''))
    case 'property_type_in': {
      if (!ctx.property_id) return false
      const { data } = await client.from('properties').select('type').eq('id', ctx.property_id).maybeSingle()
      return !!data && vals.includes(data.type)
    }
    case 'contact_kind_in': {
      if (!ctx.contact_id) return false
      const { data } = await client.from('contacts').select('kind').eq('id', ctx.contact_id).maybeSingle()
      return !!data && vals.includes(data.kind)
    }
    case 'marketing_subscribed': {
      if (!ctx.contact_id) return false
      const { data } = await client.from('contacts').select('marketing_status').eq('id', ctx.contact_id).maybeSingle()
      return data?.marketing_status === 'subscribed'
    }
    case 'inspection_status_in': {
      if (!ctx.viewing_id) return false
      const { data } = await client.from('viewing_requests').select('status').eq('id', ctx.viewing_id).maybeSingle()
      return !!data && vals.includes(data.status)
    }
    case 'first_for_property': {
      if (!ctx.property_id || (!ctx.lead_id && !ctx.contact_id)) return true
      let q = client.from('automation_runs').select('id', { count: 'exact', head: true })
        .eq('automation_id', automationId).eq('context->>property_id', ctx.property_id)
      q = ctx.lead_id ? q.eq('lead_id', ctx.lead_id) : q.eq('contact_id', String(ctx.contact_id))
      if (runId) q = q.neq('id', runId)
      const { count } = await q
      return !count
    }
  }
  return true
}

/* --------------------------------------------------------------- execution */

async function teamRecipients(): Promise<string[]> {
  const settings = await getEmailSettings()
  if (settings.notifyRecipients.length) return settings.notifyRecipients
  const { data } = await db().from('admin_users').select('email').in('role', ['admin', 'super_admin']).eq('active', true)
  const list = (data || []).map(r => String(r.email).toLowerCase())
  const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (owner && !list.includes(owner)) list.push(owner)
  return list
}

export async function resolveRecipients(to: string, run: Pick<RunRow, 'contact_id' | 'context'>): Promise<{ email: string; name?: string | null; contactId?: string | null }[]> {
  const client = db()
  if (to === 'contact') {
    if (!run.contact_id) return []
    const { data } = await client.from('contacts').select('id, email, name').eq('id', run.contact_id).maybeSingle()
    return data ? [{ email: data.email, name: data.name, contactId: data.id }] : []
  }
  const agent = to === 'assigned_agent' || to === 'agent_or_team' ? await agentFor(run.context) : null
  if (agent) return [{ email: agent.email, name: agent.name }]
  if (to === 'team' || to === 'agent_or_team') return (await teamRecipients()).map(email => ({ email }))
  return []
}

const autoCache = new Map<string, { at: number; row: AutomationRow }>()
async function getAutomation(id: string): Promise<AutomationRow | null> {
  const hit = autoCache.get(id)
  if (hit && Date.now() - hit.at < 10_000) return hit.row
  const { data } = await db().from('automations').select('*').eq('id', id).maybeSingle()
  if (data) autoCache.set(id, { at: Date.now(), row: data as AutomationRow })
  return data as AutomationRow | null
}

export interface RunStats { runs: number; steps: number; completed: number; failed: number }

export async function processRuns(deadline: number, limit = 50): Promise<RunStats> {
  const stats: RunStats = { runs: 0, steps: 0, completed: 0, failed: 0 }
  const client = db()
  const { data, error } = await client.rpc('claim_automation_runs', { p_limit: limit })
  if (error) throw new Error(`claim_automation_runs: ${error.message}`)
  for (const run of (data || []) as RunRow[]) {
    if (Date.now() > deadline) { await client.from('automation_runs').update({ locked_until: null }).eq('id', run.id); continue }
    stats.runs++
    try {
      const r = await advanceRun(run)
      stats.steps += r.steps
      if (r.done) stats.completed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const attempts = run.attempts + 1
      await client.from('automation_runs').update({
        attempts, last_error: msg, locked_until: null,
        ...(attempts >= 5 ? { status: 'failed', finished_at: new Date().toISOString() } : { next_run_at: new Date(Date.now() + attempts * 5 * 60_000).toISOString() }),
      }).eq('id', run.id)
      stats.failed++
    }
  }
  return stats
}

async function advanceRun(run: RunRow): Promise<{ steps: number; done: boolean }> {
  const client = db()
  const auto = await getAutomation(run.automation_id)
  if (!auto) {
    await client.from('automation_runs').update({ status: 'exited', exit_reason: 'Workflow deleted', finished_at: new Date().toISOString(), locked_until: null }).eq('id', run.id)
    return { steps: 0, done: true }
  }
  const steps = auto.steps || []
  const ctx: Ctx = { ...(run.context || {}), contact_id: run.contact_id }
  let i = run.step_index
  let count = 0

  const log = async (idx: number, type: string, status: string, detail?: string, messageId?: string) => {
    const { error } = await client.from('automation_step_logs').insert({ run_id: run.id, step_index: idx, step_type: type, status, detail: detail || null, message_id: messageId || null })
    return !error // false = this step was already logged (ran before)
  }
  const finish = async (status: 'completed' | 'exited', reason?: string) => {
    await client.from('automation_runs').update({ status, exit_reason: reason || null, step_index: i, finished_at: new Date().toISOString(), locked_until: null, last_error: null }).eq('id', run.id)
  }

  while (i < steps.length) {
    const step = steps[i]
    const { data: already } = await client.from('automation_step_logs').select('status').eq('run_id', run.id).eq('step_index', i).maybeSingle()
    if (already) {
      if (already.status === 'stopped') { await finish('exited', 'Condition not met'); return { steps: count, done: true } }
      i++; continue
    }
    count++

    if (step.type === 'wait') {
      await log(i, 'wait', 'done', `Waited ${step.minutes} min`)
      i++
      await client.from('automation_runs').update({ step_index: i, next_run_at: new Date(Date.now() + step.minutes * 60_000).toISOString(), locked_until: null, last_error: null }).eq('id', run.id)
      return { steps: count, done: false }
    }

    if (step.type === 'condition') {
      const ok = await check(step, ctx, auto.id, run.id)
      if (ok) { await log(i, 'condition', 'done', 'Condition met'); i++; continue }
      if (step.else === 'skip_next') {
        await log(i, 'condition', 'skipped', 'Condition not met; next step skipped')
        if (i + 1 < steps.length) await log(i + 1, steps[i + 1].type, 'skipped', 'Skipped by condition')
        i += 2; continue
      }
      await log(i, 'condition', 'stopped', `Stopped: ${step.check} not met`)
      await finish('exited', `Condition not met: ${step.check}`)
      return { steps: count, done: true }
    }

    if (step.type === 'email' || step.type === 'notify') {
      let template = step.template
      if (template === 'auto:enquiry') template = ctx.property_id ? 'property_enquiry_confirmation' : 'enquiry_confirmation'
      const to = step.type === 'notify' ? step.to : (step.to || 'contact')
      const recipients = await resolveRecipients(to, { contact_id: run.contact_id, context: ctx })
      if (!recipients.length) { await log(i, step.type, 'skipped', `No recipient (${to})`); i++; continue }
      const ids: string[] = []
      for (const r of recipients) {
        const q = await queueEmail({
          to: r.email, toName: r.name, contactId: r.contactId || null, templateKey: template,
          category: step.type === 'notify' ? 'internal' : step.category,
          context: { ...ctx, promotes_property: template.startsWith('nurture_property') || template === 'nurture_consider' },
          idempotencyKey: `run:${run.id}:${i}:${r.email}`,
          automationId: auto.id, runId: run.id,
        })
        ids.push(q.id)
      }
      await log(i, step.type, 'done', `Queued ${template} to ${recipients.map(r => r.email).join(', ')}`, ids[0])
      i++; continue
    }

    if (step.type === 'update_lead') {
      if (ctx.lead_id) {
        const { data: l } = await client.from('leads').select('status').eq('id', ctx.lead_id).maybeSingle()
        // Only ever move a lead forward automatically, and never out of converted/lost
        if (l && !['converted', 'lost'].includes(l.status) && (LEAD_STATUS_RANK[step.status] ?? 0) > (LEAD_STATUS_RANK[l.status] ?? 0)) {
          await client.from('leads').update({ status: step.status }).eq('id', ctx.lead_id)
          await client.from('lead_activities').insert({ lead_id: ctx.lead_id, type: 'status_change', from_value: l.status, to_value: step.status, actor_name: `Workflow: ${auto.name}` })
          await log(i, 'update_lead', 'done', `${l.status} → ${step.status}`)
        } else await log(i, 'update_lead', 'skipped', 'Lead already at or past this stage')
      } else await log(i, 'update_lead', 'skipped', 'No lead')
      i++; continue
    }

    if (step.type === 'add_tag') {
      if (run.contact_id) {
        const { data: c } = await client.from('contacts').select('tags').eq('id', run.contact_id).maybeSingle()
        if (c) await client.from('contacts').update({ tags: Array.from(new Set([...(c.tags || []), step.tag])) }).eq('id', run.contact_id)
      }
      await log(i, 'add_tag', 'done', step.tag)
      i++; continue
    }

    await log(i, (step as { type: string }).type, 'skipped', 'Unknown step type')
    i++
  }
  await finish('completed')
  return { steps: count, done: true }
}

/** Retry a failed run from the step it failed on. Already-sent steps stay sent. */
export async function retryRun(runId: string) {
  await db().from('automation_runs').update({ status: 'active', attempts: 0, last_error: null, next_run_at: new Date().toISOString(), finished_at: null, locked_until: null })
    .eq('id', runId).eq('status', 'failed')
}
