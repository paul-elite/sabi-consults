'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { RequireRole, canAccess, useAdminUser } from '@/components/admin/AdminNav'
import { Empty, Modal, StatusBadge, fmtDateTime, naira, send, useApi, useToast } from '@/components/admin/email/ui'
import { TRANSACTION_STAGES } from '@/lib/email/defaults'

interface Tx {
  id: string; reference: string; stage: string; offer_amount: number | null; agreed_price: number | null; amount_received: number | null
  notes: string | null; assigned_to: string | null; created_at: string; updated_at: string; completed_at: string | null
  property: { id: string; title: string; district: string } | null
  lead: { id: string; name: string; phone: string; email: string | null } | null
  assignee: { id: string; name: string } | null
}
interface TxDetail extends Tx {
  events: { id: string; stage: string; note: string | null; amount: number | null; customer_notified: boolean; actor_name: string | null; created_at: string }[]
  emails: { id: string; to_email: string; template_key: string; subject: string | null; status: string; status_reason: string | null; sent_at: string | null; created_at: string }[]
}

const stageLabel = (s: string) => TRANSACTION_STAGES.find(x => x.value === s)?.label || s

function TransactionsPage() {
  const focus = useSearchParams().get('focus')
  const [stage, setStage] = useState('')
  const { data, loading, error, reload } = useApi<Tx[]>(`/api/transactions${stage ? `?stage=${stage}` : ''}`, [stage])
  const [open, setOpen] = useState<string | null>(focus)
  const { show, node } = useToast()
  useEffect(() => { if (focus) setOpen(focus) }, [focus])
  const active = (data || []).filter(t => !['completed', 'cancelled'].includes(t.stage))
  const pipeline = active.reduce((s, t) => s + (Number(t.agreed_price || t.offer_amount) || 0), 0)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {node}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Transactions</h1>
        <p className="text-sm text-neutral-500 mt-1 max-w-3xl">Track each sale from serious interest to completion. Customers are only emailed when you tick “Email the customer” on a stage update. Payment and completion stages can only be recorded by an admin.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card card-body"><p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">In progress</p><p className="text-2xl font-semibold mt-1">{active.length}</p></div>
        <div className="card card-body"><p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Pipeline value</p><p className="text-2xl font-semibold mt-1">{naira(pipeline)}</p><p className="text-xs text-neutral-500">Agreed price, or offer where not agreed</p></div>
        <div className="card card-body"><p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Completed</p><p className="text-2xl font-semibold mt-1">{(data || []).filter(t => t.stage === 'completed').length}</p></div>
      </div>
      <div className="flex gap-2 mb-4 items-center">
        <label htmlFor="tx-stage" className="text-sm text-neutral-500">Stage</label>
        <select id="tx-stage" className="form-select h-9 py-0 w-auto" value={stage} onChange={e => setStage(e.target.value)}>
          <option value="">All</option>
          {TRANSACTION_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        {loading ? <p className="p-8 text-sm text-neutral-400 animate-pulse">Loading…</p> : error ? <p className="p-8 text-sm text-red-600">{error}</p> : (data || []).length ? (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Reference</th><th>Customer</th><th>Property</th><th>Stage</th><th>Value</th><th>Agent</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {(data || []).map(t => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.reference}</td>
                    <td>{t.lead ? <Link href={`/admin/leads/${t.lead.id}`} className="hover:underline">{t.lead.name}</Link> : '–'}</td>
                    <td className="text-sm">{t.property?.title || '–'}</td>
                    <td><StatusBadge status={t.stage === 'completed' ? 'delivered' : t.stage === 'cancelled' || t.stage === 'offer_rejected' ? 'cancelled' : 'scheduled'} label={stageLabel(t.stage)} /></td>
                    <td className="text-sm">{naira(t.agreed_price || t.offer_amount)}</td>
                    <td className="text-sm">{t.assignee?.name || '–'}</td>
                    <td className="text-sm text-neutral-500">{fmtDateTime(t.updated_at)}</td>
                    <td><button className="btn btn-sm btn-ghost" onClick={() => setOpen(t.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="No transactions yet">Start one from a lead’s page when they show serious interest.</Empty>}
      </div>
      {open && <TxModal id={open} onClose={() => setOpen(null)} onChanged={m => { show('ok', m); reload() }} onError={m => show('error', m)} />}
    </main>
  )
}

function TxModal({ id, onClose, onChanged, onError }: { id: string; onClose: () => void; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const user = useAdminUser()
  const isAdmin = canAccess(user, 'admin')
  const { data: t, reload } = useApi<TxDetail>(`/api/transactions/${id}`)
  const [stage, setStage] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [notify, setNotify] = useState(false)
  const [busy, setBusy] = useState(false)
  const def = TRANSACTION_STAGES.find(s => s.value === stage)
  const needsAmount = ['payment_received', 'offer_submitted', 'offer_accepted'].includes(stage)
  const canNotify = !!def?.template && !!t?.lead?.email

  const submit = async () => {
    if (stage === 'completed' && !confirm('Complete this transaction? The customer gets a thank-you email, the lead is marked converted and the property is marked sold.')) return
    if (stage === 'payment_received' && notify && !confirm(`Email the customer a payment confirmation for ₦${Number(amount.replace(/\D/g, '')).toLocaleString()}? Only do this once the funds are verified.`)) return
    setBusy(true)
    try {
      const r = await send<{ notified: boolean }>(`/api/transactions/${id}`, 'PUT', { stage, note, amount: Number(amount.replace(/\D/g, '')) || undefined, notifyCustomer: notify })
      onChanged(r.notified ? 'Updated and the customer has been emailed' : 'Updated')
      setStage(''); setNote(''); setAmount(''); setNotify(false); reload()
    } catch (e) { onError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal title={t ? `${t.reference} · ${t.lead?.name || ''}` : 'Transaction'} onClose={onClose} wide>
      {!t ? <p className="text-sm text-neutral-400">Loading…</p> : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-neutral-400 uppercase tracking-wider">Stage</p><p className="font-medium">{stageLabel(t.stage)}</p></div>
            <div><p className="text-xs text-neutral-400 uppercase tracking-wider">Offer</p><p>{naira(t.offer_amount)}</p></div>
            <div><p className="text-xs text-neutral-400 uppercase tracking-wider">Agreed price</p><p>{naira(t.agreed_price)}</p></div>
            <div><p className="text-xs text-neutral-400 uppercase tracking-wider">Received</p><p>{naira(t.amount_received)}</p></div>
          </div>
          {t.stage !== 'completed' && t.stage !== 'cancelled' && (
            <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
              <p className="font-medium text-ink">Record the next stage</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="form-field">
                  <label htmlFor="tx-ns" className="form-label">Stage</label>
                  <select id="tx-ns" className="form-select" value={stage} onChange={e => { setStage(e.target.value); setNotify(false) }}>
                    <option value="">Choose…</option>
                    {TRANSACTION_STAGES.filter(s => s.value !== t.stage).map(s => <option key={s.value} value={s.value} disabled={s.adminOnly && !isAdmin}>{s.label}{s.adminOnly && !isAdmin ? ' (admin only)' : ''}</option>)}
                  </select>
                </div>
                {needsAmount && (
                  <div className="form-field">
                    <label htmlFor="tx-amt" className="form-label">{stage === 'payment_received' ? 'Amount received (₦)' : stage === 'offer_accepted' ? 'Agreed price (₦)' : 'Offer amount (₦)'}</label>
                    <input id="tx-amt" inputMode="numeric" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="tx-note" className="form-label">Note {notify ? <span className="form-label-optional">included in the customer email</span> : <span className="form-label-optional">internal</span>}</label>
                <textarea id="tx-note" rows={2} className="form-input form-textarea" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              {stage && stage !== 'completed' && (
                <label className={`flex items-center gap-2 text-sm ${canNotify ? '' : 'text-neutral-400'}`}>
                  <input type="checkbox" disabled={!canNotify} checked={notify} onChange={e => setNotify(e.target.checked)} />
                  Email the customer about this update{!t.lead?.email ? ' (no email on file)' : !def?.template ? ' (no customer email for this stage)' : ''}
                </label>
              )}
              <div className="flex justify-end"><button className="btn btn-md btn-primary" disabled={!stage || busy} onClick={submit}>{busy ? 'Saving…' : 'Save stage'}</button></div>
            </div>
          )}
          <div>
            <p className="font-medium text-ink mb-2">History</p>
            <ul className="divide-y divide-neutral-100 text-sm">
              {t.events.map(e => (
                <li key={e.id} className="py-2 flex flex-wrap gap-x-4">
                  <span className="w-32 text-neutral-500">{fmtDateTime(e.created_at)}</span>
                  <span className="flex-1"><strong>{stageLabel(e.stage)}</strong>{e.amount ? ` · ${naira(e.amount)}` : ''}{e.note ? ` · ${e.note}` : ''}{e.customer_notified ? ' · customer emailed' : ''}</span>
                  <span className="text-neutral-400">{e.actor_name}</span>
                </li>
              ))}
            </ul>
          </div>
          {t.emails.length > 0 && (
            <div>
              <p className="font-medium text-ink mb-2">Emails</p>
              <ul className="divide-y divide-neutral-100 text-sm">
                {t.emails.map(m => <li key={m.id} className="py-2 flex gap-3 flex-wrap"><span className="w-32 text-neutral-500">{fmtDateTime(m.sent_at || m.created_at)}</span><span className="flex-1">{m.subject || m.template_key}</span><StatusBadge status={m.status} /></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function Page() {
  return <RequireRole min="staff"><Suspense fallback={null}><TransactionsPage /></Suspense></RequireRole>
}
