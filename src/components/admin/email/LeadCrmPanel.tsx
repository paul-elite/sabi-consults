'use client'

// The sales side of a lead: assignment, follow-ups, emails, inspections,
// transactions and workflows, all on the lead page.
import Link from 'next/link'
import { useState } from 'react'
import { canAccess, useAdminUser } from '@/components/admin/AdminNav'
import { EmailPreview, Modal, StatusBadge, fmtDate, fmtDateTime, naira, send, useApi, useToast } from './ui'

interface CrmLead {
  id: string; name: string; status: string; assignedTo: string | null; nextFollowUpAt: string | null; lastContactedAt: string | null
  assignee: { id: string; name: string } | null
  mostViewedPropertyId: string | null
  contact: { id: string; email: string; marketing_status: string; followups_opt_out: boolean; suppressed: boolean; suppression_reason: string | null; tags: string[]; consent_at: string | null; consent_source: string | null } | null
  inquiries: { id: string; reference: string | null; enquiry_type: string; message: string; budget: string | null; preferred_location: string | null; created_at: string; property: { id: string; title: string } | null }[]
  transactions: { id: string; reference: string; stage: string; offer_amount: number | null; agreed_price: number | null; amount_received: number | null; created_at: string; property: { id: string; title: string } | null }[]
  emails: { id: string; to_email: string; category: string; template_key: string; subject: string | null; status: string; status_reason: string | null; send_after: string; sent_at: string | null; opened_at: string | null; clicked_at: string | null; created_at: string }[]
  activities: { id: string; type: string; from_value: string | null; to_value: string | null; actor_name: string | null; created_at: string }[]
  automationRuns: { id: string; status: string; step_index: number; next_run_at: string; exit_reason: string | null; started_at: string; automation: { id: string; name: string; steps: unknown[] } | null }[]
  viewingRequests: { id: string; status: string; reference?: string; preferredDate: string | null; confirmedDatetime: string | null; property?: { title: string } }[]
}

const SEND_TEMPLATES = [
  ['similar_properties', 'Recommend matching properties'],
  ['nurture_property_details', 'More about the property they asked about'],
  ['nurture_consider', 'Check in: still considering?'],
  ['inspection_followup', 'Post-inspection check-in'],
  ['nurture_still_looking', 'Still looking? (update preferences)'],
  ['referral_request', 'Referral request'],
  ['testimonial_request', 'Feedback request'],
] as const

const TABS = ['Emails', 'Inspections', 'Transactions', 'Enquiries', 'Workflows', 'Activity'] as const

export default function LeadCrmPanel({ leadId }: { leadId: string }) {
  const user = useAdminUser()
  const isAdmin = canAccess(user, 'admin')
  const { data: lead, reload } = useApi<CrmLead>(`/api/leads/${leadId}`)
  const { data: staff } = useApi<{ id: string; name: string }[]>('/api/email/staff')
  const { show, node } = useToast()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Emails')
  const [busy, setBusy] = useState(false)
  const [compose, setCompose] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const [newTx, setNewTx] = useState(false)

  if (!lead) return <div className="card p-5 mb-6 text-sm text-neutral-400 animate-pulse">Loading sales details…</div>

  const act = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true)
    try { await send(`/api/leads/${leadId}`, 'PUT', body); show('ok', ok); await reload() } catch (e) { show('error', (e as Error).message) } finally { setBusy(false) }
  }
  const c = lead.contact
  const activeRuns = lead.automationRuns.filter(r => r.status === 'active')

  return (
    <section className="card mb-6" aria-label="Sales and communication">
      {node}
      <div className="p-5 grid gap-4 md:grid-cols-4 border-b border-neutral-100">
        <div>
          <label htmlFor="crm-agent" className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Assigned agent</label>
          {isAdmin ? (
            <select id="crm-agent" className="form-select mt-1" disabled={busy} value={lead.assignedTo || ''}
              onChange={e => act({ assignedTo: e.target.value || null }, e.target.value ? 'Lead assigned. The agent has been emailed.' : 'Lead unassigned')}>
              <option value="">Unassigned</option>
              {(staff || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : <p className="mt-2 text-sm text-ink">{lead.assignee?.name || 'Unassigned'}</p>}
        </div>
        <div>
          <label htmlFor="crm-follow" className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Next follow-up</label>
          <input id="crm-follow" type="datetime-local" className="form-input mt-1" disabled={busy}
            defaultValue={lead.nextFollowUpAt ? new Date(new Date(lead.nextFollowUpAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
            onBlur={e => { const v = e.target.value ? new Date(e.target.value).toISOString() : null; if (v !== lead.nextFollowUpAt) act({ nextFollowUpAt: v }, 'Follow-up saved') }} />
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Email</p>
          {c ? (
            <div className="mt-2 text-sm space-y-1">
              <p className="truncate">{c.email}</p>
              <p className="flex flex-wrap gap-1">
                <StatusBadge status={c.marketing_status} label={c.marketing_status === 'subscribed' ? 'Marketing: yes' : c.marketing_status === 'pending' ? 'Marketing: unconfirmed' : 'Marketing: no'} />
                {c.followups_opt_out && <StatusBadge status="cancelled" label="No follow-ups" />}
                {c.suppressed && <StatusBadge status="bounced" label={c.suppression_reason || 'Suppressed'} />}
              </p>
              {isAdmin && <Link href={`/admin/email/contacts/${c.id}`} className="text-xs text-[#0055cc] hover:underline">Contact profile</Link>}
            </div>
          ) : <p className="mt-2 text-sm text-neutral-500">No email address on file</p>}
        </div>
        <div className="flex flex-col gap-2 md:items-end justify-center">
          <button className="btn btn-sm btn-primary" disabled={!c || busy} onClick={() => setCompose(true)}>Send an email</button>
          <button className="btn btn-sm btn-secondary" disabled={busy} title="Stops follow-up sequences for this lead"
            onClick={() => act({ replied: true }, 'Marked as replied. Automatic follow-ups have stopped.')}>They replied</button>
          {activeRuns.length > 0 && <p className="text-xs text-neutral-500">{activeRuns.length} follow-up sequence{activeRuns.length > 1 ? 's' : ''} running</p>}
        </div>
      </div>

      <div className="px-5 pt-3 border-b border-neutral-100 overflow-x-auto">
        <div role="tablist" className="flex gap-1 min-w-max">
          {TABS.map(t => {
            const count = t === 'Emails' ? lead.emails.length : t === 'Inspections' ? lead.viewingRequests.length : t === 'Transactions' ? lead.transactions.length : t === 'Enquiries' ? lead.inquiries.length : t === 'Workflows' ? lead.automationRuns.length : lead.activities.length
            return (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`px-3 h-9 text-sm border-b-2 -mb-px ${tab === t ? 'border-[#0055cc] text-[#0055cc] font-medium' : 'border-transparent text-neutral-500 hover:text-ink'}`}>
                {t} <span className="text-neutral-400">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-5" role="tabpanel">
        {tab === 'Emails' && (lead.emails.length ? (
          <ul className="divide-y divide-neutral-100">
            {lead.emails.map(m => (
              <li key={m.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="w-32 text-neutral-500">{fmtDateTime(m.sent_at || m.send_after)}</span>
                <span className="flex-1 min-w-[200px] text-ink">{m.subject || m.template_key.replace(/_/g, ' ')}<span className="text-neutral-400"> · {m.to_email}</span></span>
                <span className="flex gap-1 items-center">
                  <StatusBadge status={m.status} />
                  {m.clicked_at && <span className="badge badge-brand">Clicked</span>}
                </span>
                {m.status_reason && ['skipped', 'failed', 'queued'].includes(m.status) && <span className="w-full text-xs text-neutral-500 pl-36">{m.status_reason}</span>}
                {isAdmin && ['sent', 'delivered', 'bounced'].includes(m.status) && <button className="text-xs text-[#0055cc] hover:underline" onClick={() => setViewing(m.id)}>View</button>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">No emails yet.</p>)}

        {tab === 'Inspections' && (lead.viewingRequests.length ? (
          <ul className="divide-y divide-neutral-100">
            {lead.viewingRequests.map(v => (
              <li key={v.id} className="py-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="flex-1">{v.property?.title || 'Property'} {v.reference && <span className="text-neutral-400">· {v.reference}</span>}</span>
                <span className="text-neutral-600">{v.confirmedDatetime ? fmtDateTime(v.confirmedDatetime) : v.preferredDate ? `Asked for ${fmtDate(v.preferredDate)}` : 'No date yet'}</span>
                <StatusBadge status={v.status} />
                <Link href={`/admin/inspections?focus=${v.id}`} className="text-[#0055cc] hover:underline">Manage</Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">No inspections yet.</p>)}

        {tab === 'Transactions' && (
          <div className="space-y-3">
            {lead.transactions.map(t => (
              <div key={t.id} className="flex flex-wrap items-center gap-4 text-sm py-2 border-b border-neutral-100">
                <span className="font-medium">{t.reference}</span>
                <span className="flex-1">{t.property?.title || 'No property linked'}</span>
                <StatusBadge status={t.stage === 'completed' ? 'delivered' : t.stage === 'cancelled' ? 'cancelled' : 'scheduled'} label={t.stage.replace(/_/g, ' ')} />
                <span className="text-neutral-500">{naira(t.agreed_price || t.offer_amount)}</span>
                <Link href={`/admin/transactions?focus=${t.id}`} className="text-[#0055cc] hover:underline">Open</Link>
              </div>
            ))}
            <button className="btn btn-sm btn-secondary" onClick={() => setNewTx(true)}>Start a transaction</button>
          </div>
        )}

        {tab === 'Enquiries' && (lead.inquiries.length ? (
          <ul className="divide-y divide-neutral-100">
            {lead.inquiries.map(q => (
              <li key={q.id} className="py-3 text-sm">
                <p className="flex flex-wrap gap-3"><span className="font-medium">{q.reference || 'Enquiry'}</span><span className="text-neutral-500">{q.enquiry_type.replace(/_/g, ' ')}</span><span className="text-neutral-400">{fmtDateTime(q.created_at)}</span>{q.property && <Link className="text-[#0055cc]" href={`/properties/${q.property.id}`} target="_blank">{q.property.title}</Link>}</p>
                <p className="text-neutral-600 mt-1 whitespace-pre-line">{q.message}</p>
                {(q.budget || q.preferred_location) && <p className="text-xs text-neutral-500 mt-1">{[q.budget && `Budget: ${q.budget}`, q.preferred_location && `Area: ${q.preferred_location}`].filter(Boolean).join(' · ')}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">No enquiries recorded.</p>)}

        {tab === 'Workflows' && (lead.automationRuns.length ? (
          <ul className="divide-y divide-neutral-100">
            {lead.automationRuns.map(r => (
              <li key={r.id} className="py-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="flex-1">{r.automation?.name || 'Workflow'}</span>
                <span className="text-neutral-500">Step {Math.min(r.step_index + 1, r.automation?.steps.length || 1)} of {r.automation?.steps.length || '?'}</span>
                <StatusBadge status={r.status} />
                <span className="text-neutral-500 text-xs">{r.status === 'active' ? `Next: ${fmtDateTime(r.next_run_at)}` : r.exit_reason || ''}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">Not in any workflows.</p>)}

        {tab === 'Activity' && (
          <div className="space-y-3">
            <form className="flex gap-2" onSubmit={async e => {
              e.preventDefault()
              const input = (e.currentTarget.elements.namedItem('note') as HTMLInputElement)
              if (!input.value.trim()) return
              await act({ note: input.value }, 'Note added'); input.value = ''
            }}>
              <label htmlFor="crm-note" className="sr-only">Add a note</label>
              <input id="crm-note" name="note" className="form-input" placeholder="Log a call, meeting or note…" />
              <button className="btn btn-md btn-secondary shrink-0" disabled={busy}>Add</button>
            </form>
            <ul className="divide-y divide-neutral-100">
              {lead.activities.map(a => (
                <li key={a.id} className="py-2 text-sm flex flex-wrap gap-x-3">
                  <span className="w-32 text-neutral-500">{fmtDateTime(a.created_at)}</span>
                  <span className="flex-1">
                    {a.type === 'status_change' ? <>Status: {a.from_value?.replace(/_/g, ' ')} → <strong>{a.to_value?.replace(/_/g, ' ')}</strong></>
                      : a.type === 'assignment' ? <>Assignment changed</>
                        : a.type === 'replied' ? <>Marked as replied</>
                          : a.type === 'follow_up_set' ? <>Follow-up set for {fmtDateTime(a.to_value)}</>
                            : a.type === 'email' ? <>Sent “{a.to_value}”</> : <>{a.to_value}</>}
                  </span>
                  <span className="text-neutral-400">{a.actor_name}</span>
                </li>
              ))}
              {!lead.activities.length && <li className="py-2 text-sm text-neutral-500">No activity logged yet.</li>}
            </ul>
          </div>
        )}
      </div>

      {compose && c && <ComposeModal leadId={leadId} contactId={c.id} propertyId={lead.mostViewedPropertyId} onClose={() => setCompose(false)} onSent={() => { setCompose(false); show('ok', 'Email queued'); reload() }} />}
      {viewing && <SentEmailModal id={viewing} onClose={() => setViewing(null)} />}
      {newTx && <NewTransactionModal leadId={leadId} onClose={() => setNewTx(false)} onDone={() => { setNewTx(false); show('ok', 'Transaction started'); reload() }} />}
    </section>
  )
}

function ComposeModal({ leadId, contactId, propertyId, onClose, onSent }: { leadId: string; contactId: string; propertyId: string | null; onClose: () => void; onSent: () => void }) {
  const [template, setTemplate] = useState<string>(SEND_TEMPLATES[0][0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Modal title="Send an email" onClose={onClose}>
      <div className="space-y-4">
        <div className="form-field">
          <label htmlFor="cmp-t" className="form-label">Email</label>
          <select id="cmp-t" className="form-select" value={template} onChange={e => setTemplate(e.target.value)}>
            {SEND_TEMPLATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <p className="form-helper">Uses live listings and this lead’s details. Marketing emails only reach people who agreed to them.</p>
        </div>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-md btn-primary" disabled={busy} onClick={async () => {
            setBusy(true); setError('')
            try {
              const r = await send<{ status: string }>('/api/email/messages', 'POST', { contactId, leadId, templateKey: template, propertyId })
              if (r.status === 'skipped') setError('Not sent: this person hasn’t agreed to this kind of email.')
              else onSent()
            } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
          }}>{busy ? 'Queuing…' : 'Send'}</button>
        </div>
      </div>
    </Modal>
  )
}

export function SentEmailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useApi<{ html: string | null; subject: string | null; to_email: string; status: string; status_reason: string | null; events: { type: string; occurred_at: string; url: string | null }[] }>(`/api/email/messages/${id}`)
  return (
    <Modal title={data?.subject || 'Email'} onClose={onClose} wide>
      {!data ? <p className="text-sm text-neutral-400">Loading…</p> : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">To {data.to_email} · <StatusBadge status={data.status} /> {data.status_reason && <span className="text-neutral-500">{data.status_reason}</span>}</p>
          {data.events.length > 0 && (
            <ul className="text-xs text-neutral-500 flex flex-wrap gap-x-4">
              {data.events.map((e, i) => <li key={i}>{e.type} {fmtDateTime(e.occurred_at)}</li>)}
            </ul>
          )}
          {data.html ? <EmailPreview html={data.html} /> : <p className="text-sm text-neutral-500">The content of this email wasn’t stored.</p>}
        </div>
      )}
    </Modal>
  )
}

function NewTransactionModal({ leadId, onClose, onDone }: { leadId: string; onClose: () => void; onDone: () => void }) {
  const { data: props } = useApi<{ id: string; title: string; district: string }[]>('/api/properties')
  const [propertyId, setPropertyId] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Modal title="Start a transaction" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">Records that this lead is moving towards a purchase. Customer emails are only sent when you choose to at each stage.</p>
        <div className="form-field">
          <label htmlFor="tx-p" className="form-label">Property</label>
          <select id="tx-p" className="form-select" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
            <option value="">The property they enquired about</option>
            {(props || []).map(p => <option key={p.id} value={p.id}>{p.title} · {p.district}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="tx-n" className="form-label">Notes <span className="form-label-optional">optional</span></label>
          <textarea id="tx-n" className="form-input form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-md btn-primary" disabled={busy} onClick={async () => {
            setBusy(true); setError('')
            try { await send('/api/transactions', 'POST', { leadId, propertyId: propertyId || undefined, notes }); onDone() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
          }}>Start</button>
        </div>
      </div>
    </Modal>
  )
}
