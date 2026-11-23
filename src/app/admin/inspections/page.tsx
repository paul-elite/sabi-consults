'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { RequireRole, canAccess, useAdminUser } from '@/components/admin/AdminNav'
import { Empty, Modal, StatusBadge, fmtDate, fmtDateTime, send, useApi, useToast } from '@/components/admin/email/ui'

interface Inspection {
  id: string; reference: string | null; status: string; name: string; phone: string; email: string | null
  preferred_date: string | null; preferred_time: string | null; confirmed_datetime: string | null
  visitor_notes: string | null; agent_notes: string | null; feedback: string | null; assigned_to: string | null; created_at: string
  property: { id: string; title: string; district: string; address: string } | null
  lead: { id: string; name: string; status: string; score: number; quality: string } | null
  assignee: { id: string; name: string } | null
}

const VIEWS = [
  ['requests', 'New requests', 'pending'],
  ['upcoming', 'Upcoming', 'confirmed'],
  ['completed', 'Completed', 'completed'],
  ['all', 'All', ''],
] as const

const toLocalInput = (iso: string | null) => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''

function InspectionsPage() {
  const user = useAdminUser()
  const isAdmin = canAccess(user, 'admin')
  const focus = useSearchParams().get('focus')
  const [view, setView] = useState<(typeof VIEWS)[number][0]>(focus ? 'all' : 'requests')
  const status = VIEWS.find(v => v[0] === view)![2]
  const { data, loading, error, reload } = useApi<Inspection[]>(`/api/inspections${status ? `?status=${status}` : ''}`, [view])
  const { data: staff } = useApi<{ id: string; name: string }[]>('/api/email/staff')
  const [editing, setEditing] = useState<Inspection | null>(null)
  const { show, node } = useToast()

  useEffect(() => {
    if (focus && data) { const f = data.find(i => i.id === focus); if (f) setEditing(f) }
  }, [focus, data])

  const rows = (data || []).slice().sort((a, b) => view === 'upcoming'
    ? (a.confirmed_datetime || '').localeCompare(b.confirmed_datetime || '')
    : b.created_at.localeCompare(a.created_at))

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {node}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Inspections</h1>
        <p className="text-sm text-neutral-500 mt-1">Confirm a time to send the customer their booking details. Reminders go out automatically before the inspection, and a follow-up after you mark it completed.</p>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap" role="tablist">
        {VIEWS.map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`btn btn-sm ${view === k ? 'btn-primary' : 'btn-secondary'}`}>{l}</button>)}
      </div>
      <div className="card overflow-hidden">
        {loading ? <p className="p-8 text-sm text-neutral-400 animate-pulse">Loading…</p> : error ? <p className="p-8 text-sm text-red-600">{error}</p> : rows.length ? (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Customer</th><th>Property</th><th>When</th><th>Agent</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map(i => {
                  const overdue = i.status === 'confirmed' && i.confirmed_datetime && new Date(i.confirmed_datetime).getTime() < Date.now() - 3 * 3600_000
                  return (
                    <tr key={i.id} className={overdue ? 'bg-amber-50/50' : ''}>
                      <td>
                        <p className="font-medium text-ink">{i.lead ? <Link href={`/admin/leads/${i.lead.id}`} className="hover:underline">{i.name}</Link> : i.name}</p>
                        <p className="text-xs text-neutral-500">{i.phone}{i.email ? ` · ${i.email}` : ''}</p>
                      </td>
                      <td className="text-sm">{i.property?.title || '–'}<p className="text-xs text-neutral-500">{i.property?.district}</p></td>
                      <td className="text-sm">
                        {i.confirmed_datetime ? fmtDateTime(i.confirmed_datetime) : <span className="text-neutral-500">Asked: {i.preferred_date ? fmtDate(i.preferred_date) : 'any day'}{i.preferred_time ? `, ${i.preferred_time}` : ''}</span>}
                        {overdue && <p className="text-xs text-amber-700">Needs an update</p>}
                      </td>
                      <td className="text-sm">{i.assignee?.name || <span className="text-amber-600">Unassigned</span>}</td>
                      <td><StatusBadge status={i.status} /></td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => setEditing(i)}>Manage</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty title={view === 'requests' ? 'No new requests' : 'Nothing here yet'}>Inspection requests from the website appear here.</Empty>}
      </div>
      {editing && <ManageModal i={editing} staff={staff || []} isAdmin={isAdmin} onClose={() => setEditing(null)}
        onDone={msg => { setEditing(null); show('ok', msg); reload() }} onError={m => show('error', m)} />}
    </main>
  )
}

function ManageModal({ i, staff, isAdmin, onClose, onDone, onError }: { i: Inspection; staff: { id: string; name: string }[]; isAdmin: boolean; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [when, setWhen] = useState(toLocalInput(i.confirmed_datetime) || (i.preferred_date ? `${i.preferred_date}T${i.preferred_time === 'afternoon' ? '14:00' : i.preferred_time === 'evening' ? '17:00' : '10:00'}` : ''))
  const [agent, setAgent] = useState(i.assigned_to || '')
  const [notes, setNotes] = useState(i.agent_notes || '')
  const [feedback, setFeedback] = useState(i.feedback || '')
  const [busy, setBusy] = useState(false)
  const run = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true)
    try { await send(`/api/inspections/${i.id}`, 'PUT', body); onDone(msg) } catch (e) { onError((e as Error).message) } finally { setBusy(false) }
  }
  const open = i.status === 'pending' || i.status === 'confirmed'
  return (
    <Modal title={`Inspection · ${i.name}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="text-sm text-neutral-600 space-y-1">
          <p><strong className="text-ink">{i.property?.title}</strong>{i.reference ? ` · ${i.reference}` : ''}</p>
          <p>{i.phone}{i.email ? ` · ${i.email}` : ' · no email (the customer won’t get email confirmations)'}</p>
          {i.visitor_notes && <p className="italic">“{i.visitor_notes}”</p>}
        </div>
        {open && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="form-field">
              <label htmlFor="in-when" className="form-label">Date and time</label>
              <input id="in-when" type="datetime-local" className="form-input" value={when} onChange={e => setWhen(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="in-agent" className="form-label">Agent</label>
              <select id="in-agent" className="form-select" value={agent} disabled={!isAdmin} onChange={e => setAgent(e.target.value)}>
                <option value="">Unassigned</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="form-field">
          <label htmlFor="in-notes" className="form-label">Agent notes <span className="form-label-optional">internal</span></label>
          <textarea id="in-notes" rows={2} className="form-input form-textarea" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        {i.status === 'confirmed' && (
          <div className="form-field">
            <label htmlFor="in-fb" className="form-label">How did it go? <span className="form-label-optional">for completion</span></label>
            <textarea id="in-fb" rows={2} className="form-input form-textarea" value={feedback} onChange={e => setFeedback(e.target.value)} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-end">
          {open && (
            <button className="btn btn-md btn-primary" disabled={busy || !when}
              onClick={() => run({ action: 'confirm', datetime: new Date(when).toISOString(), assignedTo: isAdmin ? agent || null : undefined, agentNotes: notes },
                i.status === 'confirmed' ? 'Saved. If the time changed, the customer has been sent the new details.' : 'Confirmed. The customer has been emailed their booking details.')}>
              {i.status === 'confirmed' ? 'Save / reschedule' : 'Confirm booking'}
            </button>
          )}
          {i.status === 'confirmed' && <button className="btn btn-md btn-secondary" disabled={busy} onClick={() => run({ action: 'complete', feedback, agentNotes: notes }, 'Marked completed. A follow-up will be sent in a few hours.')}>Mark completed</button>}
          {i.status === 'confirmed' && <button className="btn btn-md btn-secondary" disabled={busy} onClick={() => run({ action: 'no_show', agentNotes: notes }, 'Marked as no-show')}>No-show</button>}
          {open && <button className="btn btn-md btn-danger-ghost" disabled={busy} onClick={() => { if (confirm('Cancel this inspection? The customer will be emailed.')) run({ action: 'cancel', agentNotes: notes }, 'Cancelled. Reminders were stopped and the customer was told.') }}>Cancel inspection</button>}
          {!open && <button className="btn btn-md btn-secondary" disabled={busy} onClick={() => run({ action: 'update', agentNotes: notes }, 'Notes saved')}>Save notes</button>}
        </div>
      </div>
    </Modal>
  )
}

export default function Page() {
  return <RequireRole min="staff"><Suspense fallback={null}><InspectionsPage /></Suspense></RequireRole>
}
