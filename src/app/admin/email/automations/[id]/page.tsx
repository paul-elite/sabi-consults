'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'
import { EmailShell, StatusBadge, fmtDateTime, humanMinutes, send, useApi, useToast } from '@/components/admin/email/ui'

type Step = { type: string; template?: string; to?: string; category?: string; minutes?: number; check?: string; values?: string[]; else?: string; status?: string; tag?: string }
interface Cond { check: string; values?: string[]; else?: string }
interface Automation {
  id: string; key: string | null; name: string; description: string | null; trigger: string; conditions: Cond[]; steps: Step[]; exit_on: string[]
  active: boolean; is_system: boolean; allow_reenrol: boolean; hasDefault: boolean
  runs: { id: string; subject_key: string; status: string; step_index: number; next_run_at: string; last_error: string | null; exit_reason: string | null; started_at: string; enrolled_by: string; contact: { id: string; email: string; name: string | null } | null; lead: { id: string; name: string } | null }[]
  logs: { run_id: string; step_index: number; step_type: string; status: string; detail: string | null; created_at: string }[]
}
interface Meta { triggers: Record<string, string>; exitEvents: Record<string, string>; conditions: Record<string, string>; leadStatuses: { value: string; label: string }[]; enquiryTypes: { value: string; label: string }[]; contactKinds: { value: string; label: string }[]; templates: { key: string; name: string; audience: string }[] }

const VALUE_CHECKS: Record<string, keyof Meta | 'types' | 'inspection'> = {
  lead_status_in: 'leadStatuses', lead_status_not_in: 'leadStatuses', enquiry_type_in: 'enquiryTypes', contact_kind_in: 'contactKinds', property_type_in: 'types', inspection_status_in: 'inspection',
}
const PROPERTY_TYPES = [{ value: 'house', label: 'House' }, { value: 'land', label: 'Land' }]
const INSPECTION_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map(v => ({ value: v, label: v.replace('_', ' ') }))
const UNITS = [['minutes', 1], ['hours', 60], ['days', 1440]] as const

function splitMinutes(m: number): [number, number] {
  if (m % 1440 === 0) return [m / 1440, 1440]
  if (m % 60 === 0) return [m / 60, 60]
  return [m, 1]
}

function Builder({ id }: { id: string }) {
  const router = useRouter()
  const isNew = id === 'new'
  const { data: listing } = useApi<{ meta: Meta }>('/api/email/automations')
  const { data: a, reload } = useApi<Automation>(isNew ? null : `/api/email/automations/${id}`)
  const [runFilter, setRunFilter] = useState('')
  const { show, node } = useToast()
  const [f, setF] = useState<Pick<Automation, 'name' | 'description' | 'trigger' | 'conditions' | 'steps' | 'exit_on' | 'allow_reenrol'>>({
    name: '', description: '', trigger: 'inquiry.created', conditions: [], steps: [{ type: 'wait', minutes: 1440 }, { type: 'email', template: 'nurture_consider', to: 'contact' }], exit_on: ['lead.replied', 'subscriber.unsubscribed'], allow_reenrol: false,
  })
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [openRun, setOpenRun] = useState<string | null>(null)
  useEffect(() => { if (a && !dirty) setF({ name: a.name, description: a.description, trigger: a.trigger, conditions: a.conditions, steps: a.steps, exit_on: a.exit_on, allow_reenrol: a.allow_reenrol }) }, [a, dirty])
  const meta = listing?.meta
  if (!meta || (!isNew && !a)) return <EmailShell title="Workflow"><p className="text-sm text-neutral-400 animate-pulse">Loading…</p></EmailShell>

  const upd = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setDirty(true) }
  const setStep = (i: number, patch: Partial<Step>) => upd({ steps: f.steps.map((s, j) => j === i ? { ...s, ...patch } : s) })
  const move = (i: number, d: -1 | 1) => { const s = [...f.steps]; const [x] = s.splice(i, 1); s.splice(i + d, 0, x); upd({ steps: s }) }
  const optionsFor = (check: string) => {
    const k = VALUE_CHECKS[check]
    return k === 'types' ? PROPERTY_TYPES : k === 'inspection' ? INSPECTION_STATUSES : k ? (meta[k] as { value: string; label: string }[]) : null
  }
  const tplName = (k?: string) => k === 'auto:enquiry' ? 'Enquiry confirmation (matches the enquiry type)' : meta.templates.find(t => t.key === k)?.name || k
  const emailTemplates = meta.templates.filter(t => t.audience !== 'internal')
  const internalTemplates = meta.templates.filter(t => t.audience === 'internal')

  const save = async () => {
    setBusy(true)
    try {
      if (isNew) { const r = await send<{ id: string }>('/api/email/automations', 'POST', f); router.replace(`/admin/email/automations/${r.id}`); show('ok', 'Created. It’s off until you turn it on.') }
      else { const r = await send<{ note?: string }>(`/api/email/automations/${id}`, 'PUT', f); setDirty(false); show('ok', r.note || 'Saved'); reload() }
    } catch (e) { show('error', (e as Error).message) } finally { setBusy(false) }
  }
  const runs = (a?.runs || []).filter(r => !runFilter || r.status === runFilter)
  const failed = (a?.runs || []).filter(r => r.status === 'failed').length

  const ConditionEditor = ({ c, onChange, onRemove, inline }: { c: Cond; onChange: (c: Cond) => void; onRemove: () => void; inline?: boolean }) => {
    const opts = optionsFor(c.check)
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`cond-${c.check}`}>Condition</label>
          <select className="form-select" value={c.check} onChange={e => onChange({ ...c, check: e.target.value, values: [] })}>
            {Object.entries(meta.conditions).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onRemove} aria-label="Remove">✕</button>
        </div>
        {opts && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {opts.map(o => <label key={o.value} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={(c.values || []).includes(o.value)}
              onChange={e => onChange({ ...c, values: e.target.checked ? [...(c.values || []), o.value] : (c.values || []).filter(v => v !== o.value) })} />{o.label}</label>)}
          </div>
        )}
        {inline && (
          <label className="flex items-center gap-2 text-xs text-neutral-600">If not met:
            <select className="form-select h-8 py-0 w-auto text-xs" value={c.else || 'stop'} onChange={e => onChange({ ...c, else: e.target.value })}>
              <option value="stop">stop the workflow</option><option value="skip_next">skip the next step</option>
            </select>
          </label>
        )}
      </div>
    )
  }

  return (
    <EmailShell title={isNew ? 'New workflow' : f.name} description={a?.is_system ? 'Built-in workflow. You can change its steps and wording; its trigger is fixed.' : 'Trigger → conditions → steps. New workflows start switched off.'}
      actions={<>
        <button className="btn btn-md btn-primary" disabled={busy || (!dirty && !isNew)} onClick={save}>{isNew ? 'Create' : dirty ? 'Save' : 'Saved'}</button>
        {a && <button className="btn btn-md btn-secondary" onClick={async () => { await send(`/api/email/automations/${id}`, 'PUT', { active: !a.active }); show('ok', a.active ? 'Turned off' : 'Turned on'); reload() }}>{a.active ? 'Turn off' : 'Turn on'}</button>}
        {a?.hasDefault && <button className="btn btn-md btn-ghost" onClick={async () => { if (confirm('Restore the original steps?')) { await send(`/api/email/automations/${id}`, 'PUT', { reset: true }); setDirty(false); reload(); show('ok', 'Restored') } }}>Reset</button>}
        {a && !a.is_system && <button className="btn btn-md btn-danger-ghost" onClick={async () => { if (confirm('Delete this workflow? Its queued emails are cancelled.')) { await send(`/api/email/automations/${id}`, 'DELETE'); router.push('/admin/email/automations') } }}>Delete</button>}
      </>}>
      {node}
      {a && <p className="mb-4"><StatusBadge status={a.active ? 'active' : 'paused'} label={a.active ? 'On' : 'Off'} /></p>}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <section className="card p-5 space-y-3">
            <div className="form-field"><label className="form-label" htmlFor="au-n">Name</label><input id="au-n" className="form-input" value={f.name} onChange={e => upd({ name: e.target.value })} /></div>
            <div className="form-field"><label className="form-label" htmlFor="au-d">Description</label><input id="au-d" className="form-input" value={f.description || ''} onChange={e => upd({ description: e.target.value })} /></div>
          </section>

          {/* Visual flow */}
          <ol className="space-y-0" aria-label="Workflow steps">
            <li className="card p-4 border-[#0055cc]/30 bg-blue-50/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0055cc] mb-2">Trigger</p>
              <label className="sr-only" htmlFor="au-tr">Trigger</label>
              <select id="au-tr" className="form-select" disabled={a?.is_system} value={f.trigger} onChange={e => upd({ trigger: e.target.value })}>
                {Object.entries(meta.triggers).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <div className="mt-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Only if</p>
                {f.conditions.map((c, i) => <ConditionEditor key={i} c={c} onChange={nc => upd({ conditions: f.conditions.map((x, j) => j === i ? nc : x) })} onRemove={() => upd({ conditions: f.conditions.filter((_, j) => j !== i) })} />)}
                <button type="button" className="text-sm text-[#0055cc] hover:underline" onClick={() => upd({ conditions: [...f.conditions, { check: 'has_email' }] })}>+ Add condition</button>
              </div>
            </li>
            {f.steps.map((s, i) => (
              <li key={i}>
                <div className="flex justify-center"><span className="w-px h-5 bg-neutral-300" aria-hidden="true" /></div>
                <div className={`card p-4 ${s.type === 'wait' ? 'bg-neutral-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Step {i + 1} · {s.type === 'email' ? 'Email customer' : s.type === 'notify' ? 'Notify team' : s.type === 'wait' ? 'Wait' : s.type === 'condition' ? 'Check' : s.type === 'update_lead' ? 'Update lead' : 'Tag contact'}</p>
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-sm btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                      <button type="button" className="btn btn-sm btn-ghost" disabled={i === f.steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => upd({ steps: f.steps.filter((_, j) => j !== i) })} aria-label="Remove step">✕</button>
                    </div>
                  </div>
                  {s.type === 'wait' && (() => {
                    const [n, unit] = splitMinutes(s.minutes || 60)
                    return (
                      <div className="flex gap-2 items-center">
                        <label className="sr-only" htmlFor={`w-${i}`}>Wait for</label>
                        <input id={`w-${i}`} type="number" min={1} className="form-input w-24" value={n} onChange={e => setStep(i, { minutes: Math.max(1, Number(e.target.value) || 1) * unit })} />
                        <select aria-label="Unit" className="form-select w-auto" value={unit} onChange={e => setStep(i, { minutes: n * Number(e.target.value) })}>
                          {UNITS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}
                        </select>
                      </div>
                    )
                  })()}
                  {s.type === 'email' && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <select aria-label="Template" className="form-select" value={s.template} onChange={e => setStep(i, { template: e.target.value })}>
                        <option value="auto:enquiry">Enquiry confirmation (auto)</option>
                        {emailTemplates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                      </select>
                      <select aria-label="Email type" className="form-select" value={s.category || ''} onChange={e => setStep(i, { category: e.target.value || undefined })}>
                        <option value="">Use the template’s type</option>
                        <option value="transactional">Transactional: always sent</option>
                        <option value="service">Follow-up: unless opted out</option>
                        <option value="marketing">Marketing: only with consent</option>
                      </select>
                    </div>
                  )}
                  {s.type === 'notify' && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <select aria-label="Notification" className="form-select" value={s.template} onChange={e => setStep(i, { template: e.target.value })}>
                        {internalTemplates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                      </select>
                      <select aria-label="Send to" className="form-select" value={s.to} onChange={e => setStep(i, { to: e.target.value })}>
                        <option value="agent_or_team">Assigned agent (or team if none)</option><option value="assigned_agent">Assigned agent only</option><option value="team">Team notification list</option>
                      </select>
                    </div>
                  )}
                  {s.type === 'condition' && <ConditionEditor inline c={s as Cond} onChange={nc => setStep(i, nc)} onRemove={() => upd({ steps: f.steps.filter((_, j) => j !== i) })} />}
                  {s.type === 'update_lead' && (
                    <select aria-label="Lead status" className="form-select" value={s.status} onChange={e => setStep(i, { status: e.target.value })}>
                      {meta.leadStatuses.map(l => <option key={l.value} value={l.value}>Move lead to “{l.label}” (only forward)</option>)}
                    </select>
                  )}
                  {s.type === 'add_tag' && <input aria-label="Tag" className="form-input" value={s.tag || ''} onChange={e => setStep(i, { tag: e.target.value })} />}
                  {s.type === 'email' && s.template && <p className="text-xs text-neutral-500 mt-2">{tplName(s.template)} · <Link className="underline" href={`/admin/email/templates/${s.template === 'auto:enquiry' ? 'enquiry_confirmation' : s.template}`}>edit wording</Link></p>}
                </div>
              </li>
            ))}
            <li>
              <div className="flex justify-center"><span className="w-px h-5 bg-neutral-300" aria-hidden="true" /></div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[['email', '+ Email'], ['wait', '+ Wait'], ['condition', '+ Check'], ['notify', '+ Notify team'], ['update_lead', '+ Update lead'], ['add_tag', '+ Tag']].map(([type, l]) => (
                  <button key={type} type="button" className="btn btn-sm btn-secondary" onClick={() => upd({
                    steps: [...f.steps, type === 'email' ? { type, template: emailTemplates[0]?.key, to: 'contact' } : type === 'wait' ? { type, minutes: 1440 } : type === 'condition' ? { type, check: 'no_inspection_booked', else: 'stop' } : type === 'notify' ? { type, template: internalTemplates[0]?.key, to: 'agent_or_team' } : type === 'update_lead' ? { type, status: 'contacted' } : { type, tag: '' }],
                  })}>{l}</button>
                ))}
              </div>
            </li>
          </ol>

          <section className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Stop early when the person…</p>
            <div className="grid sm:grid-cols-2 gap-1">
              {Object.entries(meta.exitEvents).map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.exit_on.includes(k)} onChange={e => upd({ exit_on: e.target.checked ? [...f.exit_on, k] : f.exit_on.filter(x => x !== k) })} />{l}</label>)}
            </div>
            <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={f.allow_reenrol} onChange={e => upd({ allow_reenrol: e.target.checked })} /> Run again every time the trigger happens (otherwise once per enquiry, booking or person)</label>
          </section>
        </div>

        {a && (
          <div className="lg:col-span-2 space-y-4">
            <section className="card">
              <div className="card-header flex items-center justify-between gap-2">
                <h2 className="font-medium text-ink">Recent runs</h2>
                <div className="flex gap-2 items-center">
                  <label className="sr-only" htmlFor="rf">Filter</label>
                  <select id="rf" className="form-select h-8 py-0 w-auto text-sm" value={runFilter} onChange={e => setRunFilter(e.target.value)}>
                    <option value="">All</option><option value="active">In progress</option><option value="completed">Completed</option><option value="exited">Stopped</option><option value="failed">Failed</option>
                  </select>
                  {failed > 0 && <button className="btn btn-sm btn-secondary" onClick={async () => { await send(`/api/email/automations/${id}`, 'POST', { action: 'retry' }); show('ok', 'Retrying failed runs'); reload() }}>Retry failed</button>}
                </div>
              </div>
              <ul className="divide-y divide-neutral-100 max-h-[70vh] overflow-y-auto">
                {runs.map(r => (
                  <li key={r.id} className="px-5 py-3 text-sm">
                    <button className="w-full text-left flex items-center gap-2" onClick={() => setOpenRun(openRun === r.id ? null : r.id)} aria-expanded={openRun === r.id}>
                      <span className="flex-1 truncate">{r.contact?.name || r.contact?.email || r.lead?.name || r.subject_key}</span>
                      <StatusBadge status={r.status} />
                    </button>
                    <p className="text-xs text-neutral-500 mt-0.5">Started {fmtDateTime(r.started_at)} · step {Math.min(r.step_index + 1, f.steps.length)}/{f.steps.length}{r.status === 'active' ? ` · next ${fmtDateTime(r.next_run_at)}` : ''}</p>
                    {(r.exit_reason || r.last_error) && <p className={`text-xs mt-0.5 ${r.status === 'failed' ? 'text-red-600' : 'text-neutral-500'}`}>{r.last_error || r.exit_reason}</p>}
                    {openRun === r.id && (
                      <div className="mt-2 space-y-1">
                        <ol className="text-xs space-y-1 border-l-2 border-neutral-200 pl-3">
                          {(a.logs || []).filter(l => l.run_id === r.id).map(l => <li key={l.step_index}><span className="text-neutral-400">{l.step_index + 1}.</span> {l.step_type} · <span className={l.status === 'failed' ? 'text-red-600' : ''}>{l.status}</span>{l.detail ? ` · ${l.detail}` : ''}</li>)}
                        </ol>
                        <div className="flex gap-2 pt-1">
                          {r.status === 'failed' && <button className="btn btn-sm btn-secondary" onClick={async () => { await send(`/api/email/automations/${id}`, 'POST', { action: 'retry', runId: r.id }); show('ok', 'Retrying'); reload() }}>Retry</button>}
                          {r.status === 'active' && <button className="btn btn-sm btn-ghost" onClick={async () => { await send(`/api/email/automations/${id}`, 'POST', { action: 'exit', runId: r.id }); show('ok', 'Stopped for this person'); reload() }}>Stop for this person</button>}
                          {r.lead && <Link className="btn btn-sm btn-ghost" href={`/admin/leads/${r.lead.id}`}>Lead</Link>}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                {!runs.length && <li className="px-5 py-6 text-sm text-neutral-500">No runs yet.</li>}
              </ul>
            </section>
            <p className="text-xs text-neutral-500 px-1">Wait steps: {f.steps.filter(s => s.type === 'wait').map(s => humanMinutes(s.minutes || 0)).join(', ') || 'none'}. Every email step checks consent again at the moment of sending.</p>
          </div>
        )}
      </div>
    </EmailShell>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RequireRole min="admin"><Builder id={id} /></RequireRole>
}
