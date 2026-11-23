'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'
import { EmailShell, Empty, StatusBadge, fmtDateTime, send, useApi, useToast } from '@/components/admin/email/ui'
import { SentEmailModal } from '@/components/admin/email/LeadCrmPanel'

interface M { id: string; to_email: string; category: string; template_key: string; subject: string | null; status: string; status_reason: string | null; attempts: number; send_after: string; sent_at: string | null; clicked_at: string | null; contact_id: string | null; lead_id: string | null; created_at: string }

function LogPage() {
  const initial = useSearchParams().get('status') || ''
  const [status, setStatus] = useState(initial)
  const [category, setCategory] = useState('')
  const qs = new URLSearchParams(Object.entries({ status, category, limit: '300' }).filter(([, v]) => v)).toString()
  const { data, loading, error, reload } = useApi<M[]>(`/api/email/messages?${qs}`, [qs])
  const [viewing, setViewing] = useState<string | null>(null)
  const { show, node } = useToast()
  const act = async (id: string, action: string) => {
    try { await send(`/api/email/messages/${id}`, 'POST', { action }); show('ok', action === 'retry' ? 'Queued again' : 'Cancelled'); reload() } catch (e) { show('error', (e as Error).message) }
  }
  return (
    <EmailShell title="Delivery log" description="Every email the system has queued, sent, skipped or failed, with the reason. Skipped emails usually mean the person hadn’t agreed to that kind of email.">
      {node}
      <div className="flex flex-wrap gap-2 mb-4">
        <label className="sr-only" htmlFor="ls">Status</label>
        <select id="ls" className="form-select h-9 py-0 w-auto" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="queued,sending">Waiting</option><option value="sent,delivered">Sent</option>
          <option value="failed">Failed</option><option value="bounced,complained">Bounced / spam</option><option value="skipped,cancelled">Skipped / cancelled</option>
        </select>
        <label className="sr-only" htmlFor="lc">Type</label>
        <select id="lc" className="form-select h-9 py-0 w-auto" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All types</option><option value="transactional">Transactional</option><option value="service">Follow-up</option><option value="marketing">Marketing</option><option value="internal">Team</option>
        </select>
        <button className="btn btn-sm btn-secondary" onClick={reload}>Refresh</button>
      </div>
      <div className="card overflow-hidden">
        {loading && !data ? <p className="p-6 text-sm text-neutral-400 animate-pulse">Loading…</p> : error ? <p className="p-6 text-red-600 text-sm">{error}</p> : data?.length ? (
          <div className="table-container"><table className="table">
            <thead><tr><th>When</th><th>To</th><th>Email</th><th>Type</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.map(m => (
              <tr key={m.id}>
                <td className="text-sm text-neutral-500 whitespace-nowrap">{fmtDateTime(m.sent_at || m.send_after)}</td>
                <td className="text-sm">{m.contact_id ? <Link className="hover:underline" href={`/admin/email/contacts/${m.contact_id}`}>{m.to_email}</Link> : m.to_email}</td>
                <td className="text-sm">{m.subject || m.template_key.replace(/_/g, ' ')}{m.status_reason && !['sent', 'delivered'].includes(m.status) && <span className="block text-xs text-neutral-500">{m.status_reason}{m.attempts > 1 ? ` · ${m.attempts} attempts` : ''}</span>}</td>
                <td className="text-xs text-neutral-500">{m.category}</td>
                <td><StatusBadge status={m.status} />{m.clicked_at && <span className="badge badge-brand ml-1">Clicked</span>}</td>
                <td className="whitespace-nowrap text-right">
                  {['sent', 'delivered', 'bounced', 'complained'].includes(m.status) && <button className="btn btn-sm btn-ghost" onClick={() => setViewing(m.id)}>View</button>}
                  {['failed', 'skipped'].includes(m.status) && <button className="btn btn-sm btn-ghost" onClick={() => act(m.id, 'retry')}>Retry</button>}
                  {m.status === 'queued' && <button className="btn btn-sm btn-ghost" onClick={() => act(m.id, 'cancel')}>Cancel</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <Empty title="Nothing here" />}
      </div>
      {viewing && <SentEmailModal id={viewing} onClose={() => setViewing(null)} />}
    </EmailShell>
  )
}

export default function Page() {
  return <RequireRole min="admin"><Suspense fallback={null}><LogPage /></Suspense></RequireRole>
}
