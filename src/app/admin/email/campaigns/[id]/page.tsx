'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole, useAdminUser } from '@/components/admin/AdminNav'
import { EmailPreview, EmailShell, Modal, Stat, StatusBadge, fmtDateTime, pct, send, useApi, useToast } from '@/components/admin/email/ui'
import { CAMPAIGN_TYPES, CONTACT_KINDS } from '@/lib/email/defaults'

interface Audience { kinds?: string[]; tags?: string[]; sources?: string[]; districts?: string[]; types?: string[]; minScore?: number | null; customersOnly?: boolean; engagedWithinDays?: number | null }
interface Exclude { tags?: string[]; kinds?: string[]; emailedWithinDays?: number | null }
interface Campaign {
  id: string; name: string; type: string; status: string; template_key: string; subject: string; preheader: string | null; body: string
  property_ids: string[]; audience: Audience; exclude: Exclude; scheduled_at: string | null; started_at: string | null; finished_at: string | null
  stats: Record<string, number>; conversions: { conversion_type: string; model: string }[]
}

const csv = (a?: string[]) => (a || []).join(', ')
const list = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

function CampaignEditor({ id }: { id: string }) {
  const router = useRouter()
  const user = useAdminUser()
  const { data: c, reload, error } = useApi<Campaign>(`/api/email/campaigns/${id}`)
  const { data: templates } = useApi<{ templates: { key: string; name: string; audience: string }[] }>('/api/email/templates')
  const { data: properties } = useApi<{ id: string; title: string; district: string; status: string; price: number }[]>('/api/properties?status=available')
  const { show, node } = useToast()
  const [draft, setDraft] = useState<Campaign | null>(null)
  const [dirty, setDirty] = useState(false)
  const [count, setCount] = useState<{ count: number; sample: { email: string; name: string | null }[] } | null>(null)
  const [preview, setPreview] = useState<{ html: string; subject: string; preheader: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [schedule, setSchedule] = useState(false)
  const [when, setWhen] = useState('')
  const [testTo, setTestTo] = useState('')

  useEffect(() => { if (c && !dirty) setDraft(c) }, [c, dirty])
  useEffect(() => { if (user?.email && !testTo) setTestTo(user.email) }, [user, testTo])
  if (error) return <EmailShell title="Campaign"><p className="alert alert-error">{error}</p></EmailShell>
  if (!draft || !c) return <EmailShell title="Campaign"><p className="text-sm text-neutral-400 animate-pulse">Loading…</p></EmailShell>

  const editable = ['draft', 'scheduled', 'paused'].includes(c.status)
  const upd = (patch: Partial<Campaign>) => { setDraft({ ...draft, ...patch }); setDirty(true); setCount(null) }
  const updA = (patch: Partial<Audience>) => upd({ audience: { ...draft.audience, ...patch } })
  const updX = (patch: Partial<Exclude>) => upd({ exclude: { ...draft.exclude, ...patch } })

  const save = async (quiet = false) => {
    await send(`/api/email/campaigns/${id}`, 'PUT', {
      name: draft.name, type: draft.type, templateKey: draft.template_key, subject: draft.subject, preheader: draft.preheader, body: draft.body,
      propertyIds: draft.property_ids, audience: draft.audience, exclude: draft.exclude,
    })
    setDirty(false)
    if (!quiet) show('ok', 'Saved')
    await reload()
  }
  const action = async (a: string, extra: Record<string, unknown> = {}, ok?: string) => {
    setBusy(true)
    try {
      if (dirty && editable) await save(true)
      const r = await send<Record<string, unknown>>(`/api/email/campaigns/${id}`, 'POST', { action: a, ...extra })
      if (a === 'count') setCount(r as unknown as typeof count)
      else if (a === 'preview') setPreview(r as unknown as typeof preview)
      else if (a === 'duplicate') router.push(`/admin/email/campaigns/${(r as { id: string }).id}`)
      else { if (ok) show('ok', typeof r.recipients === 'number' ? `${ok} (${r.recipients} recipients)` : ok); await reload() }
    } catch (e) { show('error', (e as Error).message) } finally { setBusy(false) }
  }
  const s = c.stats || {}
  const conv = (t: string, m?: string) => c.conversions.filter(x => (t === 'enquiry' ? ['enquiry', 'lead'].includes(x.conversion_type) : x.conversion_type === t) && (!m || x.model === m)).length
  const marketingTemplates = (templates?.templates || []).filter(t => t.audience === 'marketing')

  return (
    <EmailShell title={draft.name} description={`${CAMPAIGN_TYPES.find(t => t.value === draft.type)?.label} · ${c.status}${c.started_at ? ` · started ${fmtDateTime(c.started_at)}` : ''}`}
      actions={<>
        {editable && <button className="btn btn-md btn-secondary" disabled={busy || !dirty} onClick={() => save().catch(e => show('error', e.message))}>{dirty ? 'Save draft' : 'Saved'}</button>}
        <button className="btn btn-md btn-secondary" disabled={busy} onClick={() => action('preview')}>Preview</button>
        {c.status === 'draft' && <button className="btn btn-md btn-secondary" disabled={busy} onClick={() => setSchedule(true)}>Schedule</button>}
        {['draft', 'scheduled'].includes(c.status) && <button className="btn btn-md btn-primary" disabled={busy} onClick={() => { if (confirm('Send this campaign now to everyone in the audience?')) action('send_now', {}, 'Sending started') }}>Send now</button>}
        {['sending', 'scheduled'].includes(c.status) && <button className="btn btn-md btn-secondary" disabled={busy} onClick={() => action('pause', {}, 'Paused')}>Pause</button>}
        {c.status === 'paused' && <button className="btn btn-md btn-primary" disabled={busy} onClick={() => action('resume', {}, 'Resumed')}>Resume</button>}
        {['sending', 'scheduled', 'paused'].includes(c.status) && <button className="btn btn-md btn-danger-ghost" disabled={busy} onClick={() => { if (confirm('Cancel the campaign? Emails not yet sent will be cancelled.')) action('cancel', {}, 'Cancelled') }}>Cancel</button>}
        <button className="btn btn-md btn-ghost" disabled={busy} onClick={() => action('duplicate')}>Duplicate</button>
        {c.status === 'draft' && <button className="btn btn-md btn-ghost" disabled={busy} onClick={async () => { if (confirm('Delete this draft?')) { await send(`/api/email/campaigns/${id}`, 'DELETE'); router.push('/admin/email/campaigns') } }}>Delete</button>}
      </>}>
      {node}
      {c.status !== 'draft' && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Stat label="Sent" value={s.sent || 0} sub={s.queued ? `${s.queued} queued` : undefined} />
          <Stat label="Delivered" value={pct(s.delivered || 0, s.sent || 0)} />
          <Stat label="Clicked" value={pct(s.clicked || 0, s.sent || 0)} sub={`${s.clicked || 0} people`} />
          <Stat label="Opened" tone="muted" value={pct(s.opened || 0, s.sent || 0)} hint="Estimate: privacy features over-count opens" />
          <Stat label="Enquiries" value={conv('enquiry', 'direct')} sub={`+${conv('enquiry', 'assisted')} assisted`} />
          <Stat label="Inspections · Sales" value={`${conv('inspection')} · ${conv('transaction')}`} />
        </div>
      )}
      {c.status === 'scheduled' && <p className="alert mb-4 bg-blue-50 text-blue-900">Scheduled for {fmtDateTime(c.scheduled_at)}.</p>}
      {!editable && <p className="alert mb-4 bg-neutral-100 text-sm">This campaign has {c.status === 'sent' ? 'been sent' : 'started'}, so its content can’t be changed. Duplicate it to send something similar.</p>}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="font-medium text-ink">Content</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="form-field"><label className="form-label" htmlFor="cp-n">Campaign name</label><input id="cp-n" disabled={!editable} className="form-input" value={draft.name} onChange={e => upd({ name: e.target.value })} /></div>
              <div className="form-field"><label className="form-label" htmlFor="cp-t">Template</label>
                <select id="cp-t" disabled={!editable} className="form-select" value={draft.template_key} onChange={e => upd({ template_key: e.target.value })}>
                  {marketingTemplates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                </select></div>
            </div>
            <div className="form-field"><label className="form-label" htmlFor="cp-s">Subject line</label><input id="cp-s" disabled={!editable} className="form-input" maxLength={200} value={draft.subject} onChange={e => upd({ subject: e.target.value })} placeholder="e.g. 5 new homes in Gwarinpa this month" /></div>
            <div className="form-field"><label className="form-label" htmlFor="cp-p">Preview text <span className="form-label-optional">shown after the subject in the inbox</span></label><input id="cp-p" disabled={!editable} className="form-input" maxLength={200} value={draft.preheader || ''} onChange={e => upd({ preheader: e.target.value })} /></div>
            <div className="form-field">
              <label className="form-label" htmlFor="cp-b">Message</label>
              <textarea id="cp-b" disabled={!editable} rows={10} className="form-input form-textarea font-mono text-sm" value={draft.body} onChange={e => upd({ body: e.target.value })}
                placeholder={'Write your message. Blank lines start new paragraphs.\n\n**bold**, [link text](https://...), "- " for a list\n{{first_name}} inserts their name'} />
              <p className="form-helper">The template adds the greeting, your selected properties, branding and the unsubscribe footer.</p>
            </div>
            <div>
              <p className="form-label mb-2">Featured properties <span className="form-label-optional">current details are pulled at send time; unavailable ones are dropped</span></p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-100">
                {(properties || []).filter(p => p.status === 'available').map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer">
                    <input type="checkbox" disabled={!editable || (!draft.property_ids.includes(p.id) && draft.property_ids.length >= 8)} checked={draft.property_ids.includes(p.id)}
                      onChange={e => upd({ property_ids: e.target.checked ? [...draft.property_ids, p.id] : draft.property_ids.filter(x => x !== p.id) })} />
                    <span className="flex-1">{p.title}</span><span className="text-neutral-500">{p.district}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="font-medium text-ink">Audience</h2>
            <p className="text-xs text-neutral-500">Always limited to subscribed contacts who haven’t bounced or been archived.</p>
            <fieldset><legend className="form-label">Contact types <span className="form-label-optional">none = all</span></legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {CONTACT_KINDS.map(k => <label key={k.value} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!editable} checked={(draft.audience.kinds || []).includes(k.value)}
                  onChange={e => updA({ kinds: e.target.checked ? [...(draft.audience.kinds || []), k.value] : (draft.audience.kinds || []).filter(x => x !== k.value) })} />{k.label}</label>)}
              </div>
            </fieldset>
            <fieldset><legend className="form-label">Interested in</legend>
              <div className="flex gap-4">{['house', 'land'].map(t => <label key={t} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" disabled={!editable} checked={(draft.audience.types || []).includes(t)}
                onChange={e => updA({ types: e.target.checked ? [...(draft.audience.types || []), t] : (draft.audience.types || []).filter(x => x !== t) })} />{t}</label>)}</div>
            </fieldset>
            <div className="form-field"><label className="form-label" htmlFor="au-d">Areas they asked about</label><input id="au-d" disabled={!editable} className="form-input" defaultValue={csv(draft.audience.districts)} onBlur={e => updA({ districts: list(e.target.value) })} placeholder="e.g. Gwarinpa, Lokogoma" /></div>
            <div className="form-field"><label className="form-label" htmlFor="au-t">With any of these tags</label><input id="au-t" disabled={!editable} className="form-input" defaultValue={csv(draft.audience.tags)} onBlur={e => updA({ tags: list(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-field"><label className="form-label" htmlFor="au-s">Min lead score</label><input id="au-s" disabled={!editable} inputMode="numeric" className="form-input" defaultValue={draft.audience.minScore ?? ''} onBlur={e => updA({ minScore: Number(e.target.value) || null })} /></div>
              <div className="form-field"><label className="form-label" htmlFor="au-e">Clicked in last (days)</label><input id="au-e" disabled={!editable} inputMode="numeric" className="form-input" defaultValue={draft.audience.engagedWithinDays ?? ''} onBlur={e => updA({ engagedWithinDays: Number(e.target.value) || null })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!editable} checked={!!draft.audience.customersOnly} onChange={e => updA({ customersOnly: e.target.checked })} /> Past customers only</label>
            <div className="pt-2 border-t border-neutral-100 space-y-3">
              <p className="form-label">Exclude</p>
              <div className="form-field"><label className="form-label" htmlFor="ex-t">People tagged</label><input id="ex-t" disabled={!editable} className="form-input" defaultValue={csv(draft.exclude.tags)} onBlur={e => updX({ tags: list(e.target.value) })} /></div>
              <div className="form-field"><label className="form-label" htmlFor="ex-d">Anyone emailed in the last (days)</label><input id="ex-d" disabled={!editable} inputMode="numeric" className="form-input" defaultValue={draft.exclude.emailedWithinDays ?? ''} onBlur={e => updX({ emailedWithinDays: Number(e.target.value) || null })} /></div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button className="btn btn-sm btn-secondary" disabled={busy} onClick={() => action('count')}>Count recipients</button>
              {count && <span className="text-sm"><strong>{count.count.toLocaleString()}</strong> recipients</span>}
            </div>
            {count && count.sample.length > 0 && <p className="text-xs text-neutral-500">e.g. {count.sample.map(x => x.name || x.email).join(', ')}</p>}
          </section>

          <section className="card p-5 space-y-3">
            <h2 className="font-medium text-ink">Send a test</h2>
            <div className="flex gap-2">
              <label htmlFor="tt" className="sr-only">Test address</label>
              <input id="tt" type="email" className="form-input" value={testTo} onChange={e => setTestTo(e.target.value)} />
              <button className="btn btn-md btn-secondary shrink-0" disabled={busy} onClick={() => action('test', { to: testTo }, `Test queued to ${testTo}`)}>Send test</button>
            </div>
            <p className="text-xs text-neutral-500">Tests aren’t counted in results.</p>
          </section>
          <StatusBadge status={c.status} />
        </div>
      </div>

      {preview && <Modal title="Preview" onClose={() => setPreview(null)} wide><EmailPreview html={preview.html} subject={preview.subject} preheader={preview.preheader} /></Modal>}
      {schedule && (
        <Modal title="Schedule campaign" onClose={() => setSchedule(false)}>
          <div className="space-y-4">
            <div className="form-field"><label className="form-label" htmlFor="sch">Send at (your local time)</label><input id="sch" type="datetime-local" className="form-input" value={when} onChange={e => setWhen(e.target.value)} /></div>
            <div className="flex justify-end gap-2"><button className="btn btn-md btn-ghost" onClick={() => setSchedule(false)}>Cancel</button>
              <button className="btn btn-md btn-primary" disabled={!when || busy} onClick={async () => { await action('schedule', { scheduledAt: new Date(when).toISOString() }, 'Scheduled'); setSchedule(false) }}>Schedule</button></div>
          </div>
        </Modal>
      )}
    </EmailShell>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RequireRole min="admin"><CampaignEditor id={id} /></RequireRole>
}
