'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'
import { EmailShell, Empty, Modal, StatusBadge, fmtDateTime, pct, send, useApi } from '@/components/admin/email/ui'
import { CAMPAIGN_TYPES } from '@/lib/email/defaults'

interface Campaign {
  id: string; name: string; type: string; status: string; subject: string; scheduled_at: string | null; started_at: string | null; finished_at: string | null
  recipient_count: number; created_at: string; stats: { sent: number; clicked: number; queued: number } | null
}

function CampaignsPage() {
  const router = useRouter()
  const { data, loading, error } = useApi<Campaign[]>('/api/email/campaigns')
  const [creating, setCreating] = useState(false)
  const [type, setType] = useState('newsletter')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [createError, setCreateError] = useState('')

  return (
    <EmailShell title="Campaigns" description="One-off emails to a chosen audience: new listings, newsletters, investment updates and owner outreach. Only subscribed contacts receive them."
      actions={<button className="btn btn-md btn-primary" onClick={() => setCreating(true)}>New campaign</button>}>
      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-sm text-neutral-400 animate-pulse">Loading…</p> : error ? <p className="p-6 text-sm text-red-600">{error}</p> : data?.length ? (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Campaign</th><th>Status</th><th>Recipients</th><th>Clicked</th><th>When</th></tr></thead>
              <tbody>
                {data.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td><Link href={`/admin/email/campaigns/${c.id}`} className="font-medium text-ink hover:underline">{c.name}</Link>
                      <p className="text-xs text-neutral-500">{CAMPAIGN_TYPES.find(t => t.value === c.type)?.label}{c.subject ? ` · ${c.subject}` : ''}</p></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-sm">{c.stats ? `${c.stats.sent}${c.stats.queued ? ` (+${c.stats.queued} queued)` : ''}` : '–'}</td>
                    <td className="text-sm">{c.stats ? pct(c.stats.clicked, c.stats.sent) : '–'}</td>
                    <td className="text-sm text-neutral-500">{c.status === 'scheduled' ? `Scheduled ${fmtDateTime(c.scheduled_at)}` : c.started_at ? fmtDateTime(c.started_at) : `Draft · ${fmtDateTime(c.created_at)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="No campaigns yet">Create a campaign to announce new listings, send a newsletter or reach property owners.</Empty>}
      </div>
      {creating && (
        <Modal title="New campaign" onClose={() => setCreating(false)}>
          <form className="space-y-4" onSubmit={async e => {
            e.preventDefault(); setBusy(true); setCreateError('')
            try { const c = await send<{ id: string }>('/api/email/campaigns', 'POST', { type, name }); router.push(`/admin/email/campaigns/${c.id}`) } catch (err) { setCreateError((err as Error).message); setBusy(false) }
          }}>
            <fieldset className="space-y-2">
              <legend className="form-label">Type</legend>
              {CAMPAIGN_TYPES.map(t => (
                <label key={t.value} className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer ${type === t.value ? 'border-[#0055cc] bg-blue-50/40' : 'border-neutral-200'}`}>
                  <input type="radio" name="ctype" checked={type === t.value} onChange={() => setType(t.value)} /> {t.label}
                </label>
              ))}
            </fieldset>
            <div className="form-field"><label className="form-label" htmlFor="cn">Name <span className="form-label-optional">only you see this</span></label><input id="cn" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. December new listings" /></div>
            {createError && <p role="alert" className="alert alert-error">{createError}</p>}
            <div className="flex justify-end gap-2"><button type="button" className="btn btn-md btn-ghost" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-md btn-primary" disabled={busy}>Create draft</button></div>
          </form>
        </Modal>
      )}
    </EmailShell>
  )
}

export default function Page() {
  return <RequireRole min="admin"><CampaignsPage /></RequireRole>
}
