import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readJson } from '@/lib/rate-limit'
import { db, isUuid } from '@/lib/email/config'
import { validateAutomation } from '@/lib/email/validate'
import { enrolManually, retryRun } from '@/lib/email/automations'
import { DEFAULT_AUTOMATIONS } from '@/lib/email/defaults'
import { kickWorker } from '@/lib/email/worker'
import { bad } from '@/lib/email/api'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const client = db()
  const { data: a } = await client.from('automations').select('*').eq('id', id).maybeSingle()
  if (!a) return bad('Not found', 404)
  const status = request.nextUrl.searchParams.get('status')
  let q = client.from('automation_runs').select('id, subject_key, status, step_index, next_run_at, last_error, exit_reason, attempts, started_at, finished_at, enrolled_by, contact:contacts(id, email, name), lead:leads(id, name)')
    .eq('automation_id', id).order('started_at', { ascending: false }).limit(100)
  if (status) q = q.eq('status', status)
  const { data: runs } = await q
  const runIds = (runs || []).map(r => r.id)
  const { data: logs } = runIds.length
    ? await client.from('automation_step_logs').select('run_id, step_index, step_type, status, detail, created_at').in('run_id', runIds).order('step_index')
    : { data: [] }
  return NextResponse.json({ ...a, hasDefault: DEFAULT_AUTOMATIONS.some(d => d.key === a.key), runs: runs || [], logs: logs || [] })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const raw = await readJson(request, 64 * 1024)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const { data: a } = await client.from('automations').select('*').eq('id', id).maybeSingle()
  if (!a) return bad('Not found', 404)

  // Quick on/off switch
  if (Object.keys(raw).length === 1 && typeof raw.active === 'boolean') {
    await client.from('automations').update({ active: raw.active }).eq('id', id)
    if (!raw.active) {
      // Turning a workflow off ends its pending runs so nothing more goes out
      await client.from('automation_runs').update({ status: 'exited', exit_reason: `Workflow turned off by ${auth.name}`, finished_at: new Date().toISOString() }).eq('automation_id', id).eq('status', 'active')
    }
    return NextResponse.json({ ok: true })
  }
  if (raw.reset === true) {
    const d = DEFAULT_AUTOMATIONS.find(x => x.key === a.key)
    if (!d) return bad('This workflow has no original version')
    await client.from('automations').update({ name: d.name, description: d.description, trigger: d.trigger, conditions: d.conditions, steps: d.steps, exit_on: d.exit_on, allow_reenrol: !!d.allow_reenrol }).eq('id', id)
    return NextResponse.json({ ok: true })
  }
  const { data: t } = await client.from('email_templates').select('key')
  const v = validateAutomation({ ...a, ...raw }, new Set((t || []).map(x => x.key)))
  if (!v.ok) return bad(v.error)
  // Built-in workflows keep their trigger, since the app relies on it
  if (a.is_system) v.value.trigger = a.trigger
  const stepsChanged = JSON.stringify(a.steps) !== JSON.stringify(v.value.steps)
  const { error } = await client.from('automations').update(v.value).eq('id', id)
  if (error) return bad(error.message, 500)
  if (stepsChanged) {
    // Runs in progress continue from their current position in the new step list
    const { count } = await client.from('automation_runs').select('id', { count: 'exact', head: true }).eq('automation_id', id).eq('status', 'active')
    return NextResponse.json({ ok: true, note: count ? `${count} people are part-way through; they continue from their current step number.` : null })
  }
  if (a.active && v.value.active === false) {
    await client.from('automation_runs').update({ status: 'exited', exit_reason: `Workflow turned off by ${auth.name}`, finished_at: new Date().toISOString() }).eq('automation_id', id).eq('status', 'active')
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const client = db()
  const { data: a } = await client.from('automations').select('is_system').eq('id', id).maybeSingle()
  if (!a) return bad('Not found', 404)
  if (a.is_system) return bad('Built-in workflows can be turned off but not deleted')
  await client.from('email_messages').update({ status: 'cancelled', status_reason: 'Workflow deleted' }).eq('automation_id', id).eq('status', 'queued')
  await client.from('automations').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}

/** retry (one failed run or all), enrol a contact manually, exit a run */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!isUuid(id)) return bad('Not found', 404)
  const raw = await readJson(request)
  if (raw instanceof NextResponse) return raw
  const client = db()
  const action = String(raw.action || '')
  if (action === 'retry') {
    if (isUuid(raw.runId)) await retryRun(String(raw.runId))
    else {
      const { data } = await client.from('automation_runs').select('id').eq('automation_id', id).eq('status', 'failed').limit(500)
      for (const r of data || []) await retryRun(r.id)
    }
    kickWorker('retry')
    return NextResponse.json({ ok: true })
  }
  if (action === 'enrol') {
    if (!isUuid(raw.contactId)) return bad('Choose a contact')
    const { data: a } = await client.from('automations').select('active').eq('id', id).maybeSingle()
    if (!a?.active) return bad('Turn the workflow on before enrolling people')
    const ctx = { property_id: isUuid(raw.propertyId) ? String(raw.propertyId) : null }
    const runId = await enrolManually(id, String(raw.contactId), ctx, `manual:${auth.name}`)
    kickWorker('enrol')
    return NextResponse.json({ ok: true, runId })
  }
  if (action === 'exit') {
    if (!isUuid(raw.runId)) return bad('Choose a run')
    await client.from('automation_runs').update({ status: 'exited', exit_reason: `Stopped by ${auth.name}`, finished_at: new Date().toISOString() }).eq('id', String(raw.runId)).eq('status', 'active')
    await client.from('email_messages').update({ status: 'cancelled', status_reason: `Stopped by ${auth.name}` }).eq('run_id', String(raw.runId)).eq('status', 'queued')
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
