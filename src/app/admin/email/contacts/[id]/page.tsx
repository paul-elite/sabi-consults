'use client'

import Link from 'next/link'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'
import { EmailShell, Modal, StatusBadge, fmtDate, fmtDateTime, naira, send, useApi, useToast } from '@/components/admin/email/ui'
import { SentEmailModal } from '@/components/admin/email/LeadCrmPanel'
import { CONTACT_KINDS } from '@/lib/email/defaults'

interface Profile {
  id: string; email: string; name: string | null; phone: string | null; kind: string; tags: string[]; source: string | null; source_detail: string | null
  utm: Record<string, string>; marketing_status: string; consent_at: string | null; consent_source: string | null; unsubscribed_at: string | null
  followups_opt_out: boolean; frequency: string; interests: { types?: string[]; districts?: string[]; minBudget?: number; maxBudget?: number; bedrooms?: number }
  birthday: string | null; customer_since: string | null; suppressed: boolean; suppression_reason: string | null; bounce_count: number
  last_emailed_at: string | null; last_engaged_at: string | null; notes: string | null; archived_at: string | null; created_at: string
  lead: { id: string; name: string; status: string; score: number; quality: string; source: string | null; utm_campaign: string | null } | null
  consent: { id: string; action: string; source: string | null; actor: string | null; wording: string | null; created_at: string }[]
  alerts: { id: string; criteria: Record<string, unknown>; active: boolean; property: { id: string; title: string } | null; created_at: string }[]
  emails: { id: string; category: string; template_key: string; subject: string | null; status: string; status_reason: string | null; send_after: string; sent_at: string | null; opened_at: string | null; clicked_at: string | null; created_at: string }[]
  runs: { id: string; status: string; step_index: number; next_run_at: string; exit_reason: string | null; last_error: string | null; started_at: string; automation: { id: string; name: string; steps: unknown[] } | null }[]
  inquiries: { id: string; reference: string | null; enquiry_type: string; message: string; created_at: string; property: { id: string; title: string } | null }[]
  inspections: { id: string; reference: string | null; status: string; preferred_date: string | null; confirmed_datetime: string | null; property: { title: string } | null }[]
  transactions: { id: string; reference: string; stage: string; agreed_price: number | null; created_at: string; property: { title: string } | null }[]
  referrals: { id: string; referred_name: string; status: string; created_at: string }[]
  interests_properties: { interest_type: string; property: { id: string; title: string; status: string } | null }[]
}

function ProfilePage({ id }: { id: string }) {
  const router = useRouter()
  const { data: c, error, reload } = useApi<Profile>(`/api/email/contacts/${id}`)
  const { data: autos } = useApi<{ automations: { id: string; name: string; active: boolean }[] }>('/api/email/automations')
  const { show, node } = useToast()
  const [edit, setEdit] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const [modal, setModal] = useState<'subscribe' | 'enrol' | 'referral' | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true)
    try { await send(`/api/email/contacts/${id}`, 'PUT', body); show('ok', ok); await reload() } catch (e) { show('error', (e as Error).message) } finally { setBusy(false) }
  }
  if (error) return <EmailShell title="Contact"><p className="alert alert-error">{error}</p></EmailShell>
  if (!c) return <EmailShell title="Contact"><p className="text-sm text-neutral-400 animate-pulse">Loading…</p></EmailShell>

  return (
    <EmailShell title={c.name || c.email} description={`${c.email}${c.phone ? ` · ${c.phone}` : ''} · ${CONTACT_KINDS.find(k => k.value === c.kind)?.label || c.kind}`}
      actions={<>
        <button className="btn btn-md btn-secondary" onClick={() => setEdit(true)}>Edit</button>
        <button className="btn btn-md btn-secondary" onClick={() => setModal('enrol')}>Add to workflow</button>
        <button className="btn btn-md btn-secondary" onClick={() => setModal('referral')}>Record referral</button>
        {c.archived_at
          ? <button className="btn btn-md btn-ghost" disabled={busy} onClick={() => save({ archived: false }, 'Restored')}>Restore</button>
          : <button className="btn btn-md btn-ghost" disabled={busy} onClick={() => save({ archived: true }, 'Archived')}>Archive</button>}
      </>}>
      {node}
      {c.archived_at && <p className="alert mb-4 bg-neutral-100">Archived on {fmtDate(c.archived_at)}. Archived contacts get no marketing.</p>}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <section className="card p-5 space-y-3">
            <h2 className="font-medium text-ink">Email permissions</h2>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Marketing</span>
              <StatusBadge status={c.marketing_status} label={c.marketing_status === 'none' ? 'not subscribed' : c.marketing_status === 'pending' ? 'awaiting confirmation' : c.marketing_status} />
            </div>
            {c.consent_at && <p className="text-xs text-neutral-500">Consent {fmtDateTime(c.consent_at)} via {c.consent_source?.replace(/_/g, ' ')}</p>}
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Follow-ups about enquiries</span>
              <StatusBadge status={c.followups_opt_out ? 'cancelled' : 'delivered'} label={c.followups_opt_out ? 'opted out' : 'allowed'} />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Deliverability</span>
              {c.suppressed ? <StatusBadge status="bounced" label={c.suppression_reason || 'suppressed'} /> : <StatusBadge status="delivered" label="ok" />}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {c.marketing_status === 'subscribed'
                ? <button className="btn btn-sm btn-secondary" disabled={busy} onClick={() => save({ marketing: 'unsubscribed' }, 'Unsubscribed')}>Unsubscribe</button>
                : <button className="btn btn-sm btn-secondary" disabled={busy} onClick={() => setModal('subscribe')}>Subscribe…</button>}
              <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => save({ followups: c.followups_opt_out }, 'Saved')}>{c.followups_opt_out ? 'Allow follow-ups' : 'Stop follow-ups'}</button>
              {c.suppressed && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => { if (confirm('Only lift suppression if you know the address works again (e.g. the person confirmed it). Continue?')) save({ suppressed: false }, 'Suppression lifted') }}>Lift suppression</button>}
            </div>
            <p className="text-xs text-neutral-500">Transactional emails (enquiry confirmations, inspection details, payment receipts) are always sent unless the address is suppressed.</p>
          </section>

          <section className="card p-5 space-y-2 text-sm">
            <h2 className="font-medium text-ink mb-1">Details</h2>
            <p><span className="text-neutral-500">Source:</span> {c.source?.replace(/_/g, ' ') || '–'}{c.source_detail ? ` (${c.source_detail})` : ''}</p>
            {Object.keys(c.utm || {}).length > 0 && <p><span className="text-neutral-500">Campaign:</span> {Object.values(c.utm).join(' / ')}</p>}
            <p><span className="text-neutral-500">Frequency:</span> {c.frequency.replace('_', ' ')}</p>
            <p><span className="text-neutral-500">Interests:</span> {[c.interests.types?.join(', '), c.interests.districts?.join(', '), c.interests.maxBudget ? `up to ${naira(c.interests.maxBudget)}` : '', c.interests.bedrooms ? `${c.interests.bedrooms}+ beds` : ''].filter(Boolean).join(' · ') || '–'}</p>
            <p><span className="text-neutral-500">Birthday:</span> {c.birthday ? fmtDate(c.birthday) : '–'}</p>
            <p><span className="text-neutral-500">Customer since:</span> {c.customer_since ? fmtDate(c.customer_since) : '–'}</p>
            <p><span className="text-neutral-500">Last engaged:</span> {fmtDateTime(c.last_engaged_at)}</p>
            <p><span className="text-neutral-500">Added:</span> {fmtDateTime(c.created_at)}</p>
            {c.tags.length > 0 && <p className="flex flex-wrap gap-1 pt-1">{c.tags.map(t => <span key={t} className="badge badge-neutral">{t}</span>)}</p>}
            {c.notes && <p className="pt-2 whitespace-pre-line text-neutral-700">{c.notes}</p>}
          </section>

          {c.lead && (
            <section className="card p-5 text-sm">
              <h2 className="font-medium text-ink mb-2">Sales lead</h2>
              <p><Link href={`/admin/leads/${c.lead.id}`} className="text-[#0055cc] hover:underline">{c.lead.name}</Link></p>
              <p className="text-neutral-600">{c.lead.status.replace(/_/g, ' ')} · score {c.lead.score} ({c.lead.quality})</p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="font-medium text-ink mb-2">Alerts and saved properties</h2>
            <ul className="text-sm space-y-1.5">
              {c.alerts.map(a => <li key={a.id}>{a.property ? <>Watching {a.property.title}</> : <>Alert: {JSON.stringify(a.criteria).replace(/[{}"]/g, '').replace(/,/g, ', ')}</>} {!a.active && <span className="text-neutral-400">(inactive)</span>}</li>)}
              {c.interests_properties.map((p, i) => p.property && <li key={i}>{p.interest_type.replace('_', ' ')}: {p.property.title}</li>)}
              {!c.alerts.length && !c.interests_properties.length && <li className="text-neutral-500">None</li>}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="font-medium text-ink mb-2">Consent history</h2>
            <ul className="text-xs space-y-2">
              {c.consent.map(r => <li key={r.id}><span className="text-neutral-500">{fmtDateTime(r.created_at)}</span> · <strong>{r.action.replace(/_/g, ' ')}</strong>{r.source ? ` via ${r.source.replace(/_/g, ' ')}` : ''}{r.actor && r.actor !== 'contact' ? ` by ${r.actor}` : ''}{r.wording ? <span className="block text-neutral-500">“{r.wording}”</span> : null}</li>)}
              {!c.consent.length && <li className="text-neutral-500">No consent changes recorded.</li>}
            </ul>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="card">
            <div className="card-header"><h2 className="font-medium text-ink">Email history</h2></div>
            <ul className="divide-y divide-neutral-100">
              {c.emails.map(m => (
                <li key={m.id} className="px-5 py-3 text-sm flex flex-wrap gap-x-4 gap-y-1 items-center">
                  <span className="w-32 text-neutral-500">{fmtDateTime(m.sent_at || m.send_after)}</span>
                  <span className="flex-1 min-w-[200px]">{m.subject || m.template_key.replace(/_/g, ' ')} <span className="text-neutral-400">· {m.category}</span></span>
                  <StatusBadge status={m.status} />
                  {m.clicked_at && <span className="badge badge-brand">Clicked</span>}
                  {['sent', 'delivered', 'bounced', 'complained'].includes(m.status) && <button className="text-xs text-[#0055cc] hover:underline" onClick={() => setViewing(m.id)}>View</button>}
                  {m.status_reason && !['sent', 'delivered'].includes(m.status) && <span className="w-full text-xs text-neutral-500 sm:pl-36">{m.status_reason}</span>}
                </li>
              ))}
              {!c.emails.length && <li className="px-5 py-6 text-sm text-neutral-500">No emails yet.</li>}
            </ul>
          </section>

          <section className="card">
            <div className="card-header"><h2 className="font-medium text-ink">Workflows</h2></div>
            <ul className="divide-y divide-neutral-100">
              {c.runs.map(r => (
                <li key={r.id} className="px-5 py-3 text-sm flex flex-wrap gap-3 items-center">
                  <Link href={`/admin/email/automations/${r.automation?.id}`} className="flex-1 hover:underline">{r.automation?.name}</Link>
                  <span className="text-neutral-500">step {Math.min(r.step_index + 1, r.automation?.steps.length || 1)}/{r.automation?.steps.length}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-neutral-500">{r.status === 'active' ? `next ${fmtDateTime(r.next_run_at)}` : r.exit_reason || r.last_error || ''}</span>
                </li>
              ))}
              {!c.runs.length && <li className="px-5 py-6 text-sm text-neutral-500">Not in any workflows.</li>}
            </ul>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="card p-5">
              <h2 className="font-medium text-ink mb-2">Enquiries</h2>
              <ul className="text-sm space-y-2">{c.inquiries.map(q => <li key={q.id}><span className="text-neutral-500">{fmtDate(q.created_at)}</span> · {q.enquiry_type.replace(/_/g, ' ')}{q.property ? ` · ${q.property.title}` : ''}<span className="block text-neutral-600 truncate">{q.message}</span></li>)}{!c.inquiries.length && <li className="text-neutral-500">None</li>}</ul>
            </section>
            <section className="card p-5">
              <h2 className="font-medium text-ink mb-2">Inspections</h2>
              <ul className="text-sm space-y-2">{c.inspections.map(v => <li key={v.id} className="flex gap-2 items-center"><span className="flex-1">{v.property?.title}</span><span className="text-neutral-500">{v.confirmed_datetime ? fmtDateTime(v.confirmed_datetime) : ''}</span><StatusBadge status={v.status} /></li>)}{!c.inspections.length && <li className="text-neutral-500">None</li>}</ul>
            </section>
            <section className="card p-5">
              <h2 className="font-medium text-ink mb-2">Transactions</h2>
              <ul className="text-sm space-y-2">{c.transactions.map(t => <li key={t.id} className="flex gap-2"><Link href={`/admin/transactions?focus=${t.id}`} className="flex-1 hover:underline">{t.reference} · {t.property?.title}</Link><span>{t.stage.replace(/_/g, ' ')}</span></li>)}{!c.transactions.length && <li className="text-neutral-500">None</li>}</ul>
            </section>
            <section className="card p-5">
              <h2 className="font-medium text-ink mb-2">Referrals made</h2>
              <ul className="text-sm space-y-2">{c.referrals.map(r => <li key={r.id} className="flex gap-2 items-center"><span className="flex-1">{r.referred_name}</span>
                <select aria-label={`Status of referral ${r.referred_name}`} className="form-select h-8 py-0 w-auto text-xs" value={r.status} onChange={async e => { try { await send('/api/referrals', 'PUT', { id: r.id, status: e.target.value }); show('ok', e.target.value === 'converted' ? 'Marked converted. A thank-you is on its way.' : 'Updated'); reload() } catch (err) { show('error', (err as Error).message) } }}>
                  {['new', 'contacted', 'converted', 'rewarded', 'invalid'].map(s => <option key={s} value={s}>{s}</option>)}
                </select></li>)}{!c.referrals.length && <li className="text-neutral-500">None</li>}</ul>
            </section>
          </div>
          <div className="text-right">
            <button className="btn btn-sm btn-danger-ghost" onClick={async () => {
              if (!confirm(`Permanently erase ${c.email}? Use this for data-deletion requests. This can’t be undone.`)) return
              try { await send(`/api/email/contacts/${id}`, 'DELETE'); router.push('/admin/email/contacts') } catch (e) { show('error', (e as Error).message) }
            }}>Erase this contact’s data</button>
          </div>
        </div>
      </div>

      {viewing && <SentEmailModal id={viewing} onClose={() => setViewing(null)} />}
      {edit && <EditModal c={c} onClose={() => setEdit(false)} onSave={async body => { await save(body, 'Saved'); setEdit(false) }} />}
      {modal === 'subscribe' && <SubscribeModal onClose={() => setModal(null)} onSave={async note => { await save({ marketing: 'subscribed', consentAttested: true, consentNote: note }, 'Subscribed'); setModal(null) }} />}
      {modal === 'enrol' && (
        <Modal title="Add to a workflow" onClose={() => setModal(null)}>
          <ul className="divide-y divide-neutral-100">
            {(autos?.automations || []).filter(a => a.active).map(a => (
              <li key={a.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span>{a.name}</span>
                <button className="btn btn-sm btn-secondary" onClick={async () => {
                  try { await send(`/api/email/automations/${a.id}`, 'POST', { action: 'enrol', contactId: id }); show('ok', `Added to ${a.name}`); setModal(null); reload() } catch (e) { show('error', (e as Error).message) }
                }}>Add</button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {modal === 'referral' && <ReferralModal referrerId={id} onClose={() => setModal(null)} onDone={() => { setModal(null); show('ok', 'Referral recorded and a lead created'); reload() }} />}
    </EmailShell>
  )
}

function EditModal({ c, onClose, onSave }: { c: Profile; onClose: () => void; onSave: (b: Record<string, unknown>) => Promise<void> }) {
  const [f, setF] = useState({
    name: c.name || '', phone: c.phone || '', kind: c.kind, tags: c.tags.join(', '), frequency: c.frequency, birthday: c.birthday || '', notes: c.notes || '',
    types: c.interests.types || [], districts: (c.interests.districts || []).join(', '), maxBudget: c.interests.maxBudget ? String(c.interests.maxBudget) : '', bedrooms: c.interests.bedrooms ? String(c.interests.bedrooms) : '',
  })
  return (
    <Modal title="Edit contact" onClose={onClose}>
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault()
        await onSave({
          name: f.name, phone: f.phone, kind: f.kind, tags: f.tags.split(',').map(t => t.trim()).filter(Boolean), frequency: f.frequency, birthday: f.birthday || null, notes: f.notes,
          interests: { types: f.types, districts: f.districts.split(',').map(d => d.trim()).filter(Boolean), maxBudget: Number(f.maxBudget) || null, bedrooms: Number(f.bedrooms) || null },
        })
      }}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="form-field"><label className="form-label" htmlFor="ec-n">Name</label><input id="ec-n" className="form-input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="ec-p">Phone</label><input id="ec-p" className="form-input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="ec-k">Type</label><select id="ec-k" className="form-select" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>{CONTACT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
          <div className="form-field"><label className="form-label" htmlFor="ec-f">Frequency</label><select id="ec-f" className="form-select" value={f.frequency} onChange={e => setF({ ...f, frequency: e.target.value })}><option value="instant">Instant</option><option value="weekly">Weekly</option><option value="important_only">Important only</option></select></div>
          <div className="form-field"><label className="form-label" htmlFor="ec-b">Birthday</label><input id="ec-b" type="date" className="form-input" value={f.birthday} onChange={e => setF({ ...f, birthday: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="ec-t">Tags</label><input id="ec-t" className="form-input" value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} /></div>
        </div>
        <fieldset className="flex gap-4 text-sm"><legend className="form-label">Interested in</legend>
          {['house', 'land'].map(t => <label key={t} className="flex items-center gap-2"><input type="checkbox" checked={f.types.includes(t)} onChange={e => setF({ ...f, types: e.target.checked ? [...f.types, t] : f.types.filter(x => x !== t) })} />{t}</label>)}
        </fieldset>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="form-field sm:col-span-3"><label className="form-label" htmlFor="ec-d">Areas</label><input id="ec-d" className="form-input" value={f.districts} onChange={e => setF({ ...f, districts: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="ec-mb">Max budget (₦)</label><input id="ec-mb" inputMode="numeric" className="form-input" value={f.maxBudget} onChange={e => setF({ ...f, maxBudget: e.target.value.replace(/\D/g, '') })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="ec-bd">Min bedrooms</label><input id="ec-bd" inputMode="numeric" className="form-input" value={f.bedrooms} onChange={e => setF({ ...f, bedrooms: e.target.value.replace(/\D/g, '') })} /></div>
        </div>
        <div className="form-field"><label className="form-label" htmlFor="ec-no">Notes</label><textarea id="ec-no" rows={3} className="form-input form-textarea" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-md btn-primary">Save</button></div>
      </form>
    </Modal>
  )
}

function SubscribeModal({ onClose, onSave }: { onClose: () => void; onSave: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('')
  return (
    <Modal title="Subscribe to marketing" onClose={onClose}>
      <form className="space-y-3" onSubmit={async e => { e.preventDefault(); await onSave(note) }}>
        <p className="text-sm text-neutral-600">Only subscribe someone who has clearly agreed to receive marketing emails. Your name and this note are kept as the consent record.</p>
        <div className="form-field"><label className="form-label" htmlFor="sb-n">How did they agree?</label><input id="sb-n" required className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Asked on a call on 14 Nov to be sent new listings" /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-md btn-primary">Subscribe</button></div>
      </form>
    </Modal>
  )
}

function ReferralModal({ referrerId, onClose, onDone }: { referrerId: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', notes: '' })
  const [error, setError] = useState('')
  return (
    <Modal title="Record a referral" onClose={onClose}>
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault(); setError('')
        try { await send('/api/referrals', 'POST', { referrerContactId: referrerId, ...f }); onDone() } catch (err) { setError((err as Error).message) }
      }}>
        <p className="text-sm text-neutral-600">Creates a lead for the person referred and thanks this contact by email. Only record people who agreed to be contacted.</p>
        <div className="form-field"><label className="form-label" htmlFor="rf-n">Their name</label><input id="rf-n" required className="form-input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="form-field"><label className="form-label" htmlFor="rf-e">Email</label><input id="rf-e" type="email" className="form-input" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="rf-p">Phone</label><input id="rf-p" className="form-input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
        </div>
        <div className="form-field"><label className="form-label" htmlFor="rf-no">Notes</label><input id="rf-no" className="form-input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-md btn-primary">Save referral</button></div>
      </form>
    </Modal>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RequireRole min="admin"><ProfilePage id={id} /></RequireRole>
}
