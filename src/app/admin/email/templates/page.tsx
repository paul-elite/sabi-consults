'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'
import { AUDIENCE_LABEL, EmailShell, Modal, fmtDate, send, useApi, useToast } from '@/components/admin/email/ui'

interface T { key: string; name: string; category: string; audience: string; subject: string; is_system: boolean; edited: boolean; updated_at: string; usage: { sent: number; clicked: number } }

function TemplatesPage() {
  const router = useRouter()
  const { data, loading, error } = useApi<{ templates: T[]; categories: Record<string, string> }>('/api/email/templates')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [from, setFrom] = useState('')
  const { show, node } = useToast()
  const groups = Object.entries(data?.categories || {}).map(([k, label]) => ({
    k, label, items: (data?.templates || []).filter(t => t.category === k && (!q || `${t.name} ${t.subject}`.toLowerCase().includes(q.toLowerCase()))),
  })).filter(g => g.items.length)

  return (
    <EmailShell title="Templates" description="Every email the system sends. Edit the wording here; property details, prices and inspection times are filled in from live data when each email is sent."
      actions={<button className="btn btn-md btn-primary" onClick={() => setCreating(true)}>New template</button>}>
      {node}
      <div className="mb-4"><label htmlFor="tq" className="sr-only">Search templates</label><input id="tq" type="search" className="form-input h-9 py-0 w-72" placeholder="Search templates" value={q} onChange={e => setQ(e.target.value)} /></div>
      {loading ? <p className="text-sm text-neutral-400 animate-pulse">Loading…</p> : error ? <p className="alert alert-error">{error}</p> : (
        <div className="space-y-6">
          {groups.map(g => (
            <section key={g.k} className="card overflow-hidden">
              <div className="card-header"><h2 className="font-medium text-ink">{g.label}</h2></div>
              <ul className="divide-y divide-neutral-100">
                {g.items.map(t => (
                  <li key={t.key}>
                    <Link href={`/admin/email/templates/${t.key}`} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-neutral-50">
                      <span className="flex-1 min-w-[220px]"><span className="text-ink font-medium">{t.name}</span><span className="block text-xs text-neutral-500 truncate">{t.subject}</span></span>
                      <span className="text-xs text-neutral-500 w-48">{AUDIENCE_LABEL[t.audience]}</span>
                      <span className="text-xs text-neutral-500 w-32">{t.usage.sent ? `${t.usage.sent} sent · ${t.usage.clicked} clicked` : 'Not sent recently'}</span>
                      <span className="text-xs w-28">{t.is_system ? (t.edited ? <span className="badge badge-info">Edited</span> : <span className="badge badge-neutral">Built-in</span>) : <span className="badge badge-brand">Custom</span>}</span>
                      <span className="text-xs text-neutral-400 w-24">{fmtDate(t.updated_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {creating && (
        <Modal title="New template" onClose={() => setCreating(false)}>
          <form className="space-y-4" onSubmit={async e => {
            e.preventDefault()
            try { const t = await send<{ key: string }>('/api/email/templates', 'POST', { name, fromKey: from || undefined, audience: 'marketing' }); router.push(`/admin/email/templates/${t.key}`) } catch (err) { show('error', (err as Error).message) }
          }}>
            <div className="form-field"><label className="form-label" htmlFor="nt-n">Name</label><input id="nt-n" required className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="form-field"><label className="form-label" htmlFor="nt-f">Start from</label>
              <select id="nt-f" className="form-select" value={from} onChange={e => setFrom(e.target.value)}>
                <option value="">Blank marketing email</option>
                {(data?.templates || []).map(t => <option key={t.key} value={t.key}>Copy of {t.name}</option>)}
              </select></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn btn-md btn-ghost" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-md btn-primary">Create</button></div>
          </form>
        </Modal>
      )}
    </EmailShell>
  )
}

export default function Page() {
  return <RequireRole min="admin"><TemplatesPage /></RequireRole>
}
