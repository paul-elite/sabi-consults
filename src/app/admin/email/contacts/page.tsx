'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'
import { EmailShell, Empty, Modal, StatusBadge, fmtDate, send, useApi, useToast } from '@/components/admin/email/ui'
import { CONTACT_KINDS } from '@/lib/email/defaults'

interface Row {
  id: string; email: string; name: string | null; phone: string | null; kind: string; tags: string[]; source: string | null
  marketing_status: string; suppressed: boolean; last_engaged_at: string | null; created_at: string
  lead: { id: string; status: string; score: number; quality: string } | null
}

function ContactsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({ q: '', kind: '', status: '', tag: '', archived: '' })
  const [page, setPage] = useState(0)
  const qs = new URLSearchParams(Object.entries({ ...filters, page: String(page) }).filter(([, v]) => v)).toString()
  const { data, loading, error, reload } = useApi<{ rows: Row[]; total: number; size: number }>(`/api/email/contacts?${qs}`, [qs])
  const [modal, setModal] = useState<'new' | 'import' | 'dupes' | null>(null)
  const { show, node } = useToast()
  const set = (k: keyof typeof filters, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(0) }

  return (
    <EmailShell title="Contacts" description="Everyone with an email address: buyers, owners, developers and partners. Marketing only reaches people who agreed to it."
      actions={<>
        <button className="btn btn-md btn-primary" onClick={() => setModal('new')}>Add contact</button>
        <button className="btn btn-md btn-secondary" onClick={() => setModal('import')}>Import CSV</button>
        <a className="btn btn-md btn-secondary" href={`/api/email/contacts/export?${new URLSearchParams(Object.entries({ kind: filters.kind, status: ['none', 'pending', 'subscribed', 'unsubscribed'].includes(filters.status) ? filters.status : '' }).filter(([, v]) => v)).toString()}`}>Export</a>
        <button className="btn btn-md btn-ghost" onClick={() => setModal('dupes')}>Find duplicates</button>
      </>}>
      {node}
      <div className="flex flex-wrap gap-2 mb-4">
        <label className="sr-only" htmlFor="c-q">Search</label>
        <input id="c-q" type="search" placeholder="Search name, email or phone" className="form-input h-9 py-0 w-64"
          onKeyDown={e => { if (e.key === 'Enter') set('q', (e.target as HTMLInputElement).value) }} onBlur={e => set('q', e.target.value)} />
        <label className="sr-only" htmlFor="c-kind">Type</label>
        <select id="c-kind" className="form-select h-9 py-0 w-auto" value={filters.kind} onChange={e => set('kind', e.target.value)}>
          <option value="">All types</option>{CONTACT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="c-status">Subscription</label>
        <select id="c-status" className="form-select h-9 py-0 w-auto" value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="">Any subscription</option><option value="subscribed">Subscribed</option><option value="pending">Awaiting confirmation</option>
          <option value="none">Not subscribed</option><option value="unsubscribed">Unsubscribed</option><option value="suppressed">Suppressed (bounced/spam)</option>
        </select>
        <label className="sr-only" htmlFor="c-tag">Tag</label>
        <input id="c-tag" placeholder="Tag" className="form-input h-9 py-0 w-32" onKeyDown={e => { if (e.key === 'Enter') set('tag', (e.target as HTMLInputElement).value.trim().toLowerCase()) }} />
        <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={!!filters.archived} onChange={e => set('archived', e.target.checked ? '1' : '')} /> Archived</label>
      </div>
      <div className="card overflow-hidden">
        {error ? <p className="p-6 text-red-600 text-sm">{error}</p> : loading && !data ? <p className="p-6 text-sm text-neutral-400 animate-pulse">Loading…</p> : data?.rows.length ? (
          <>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Contact</th><th>Type</th><th>Marketing</th><th>Lead</th><th>Source</th><th>Last engaged</th><th>Added</th></tr></thead>
                <tbody>
                  {data.rows.map(c => (
                    <tr key={c.id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => router.push(`/admin/email/contacts/${c.id}`)}>
                      <td><Link href={`/admin/email/contacts/${c.id}`} className="font-medium text-ink hover:underline" onClick={e => e.stopPropagation()}>{c.name || c.email}</Link>
                        <p className="text-xs text-neutral-500">{c.name ? c.email : ''}{c.phone ? ` · ${c.phone}` : ''}</p>
                        {c.tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{c.tags.slice(0, 4).map(t => <span key={t} className="badge badge-neutral">{t}</span>)}</p>}
                      </td>
                      <td className="text-sm capitalize">{c.kind}</td>
                      <td>{c.suppressed ? <StatusBadge status="bounced" label="suppressed" /> : <StatusBadge status={c.marketing_status} label={c.marketing_status === 'none' ? 'not subscribed' : c.marketing_status} />}</td>
                      <td className="text-sm">{c.lead ? <span>{c.lead.status.replace(/_/g, ' ')} <span className="text-neutral-400">({c.lead.score})</span></span> : '–'}</td>
                      <td className="text-sm text-neutral-600">{c.source?.replace(/_/g, ' ') || '–'}</td>
                      <td className="text-sm text-neutral-500">{fmtDate(c.last_engaged_at)}</td>
                      <td className="text-sm text-neutral-500">{fmtDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 text-sm text-neutral-500">
              <span>{data.total.toLocaleString()} contacts</span>
              <span className="flex gap-2">
                <button className="btn btn-sm btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-sm btn-secondary" disabled={(page + 1) * data.size >= data.total} onClick={() => setPage(p => p + 1)}>Next</button>
              </span>
            </div>
          </>
        ) : <Empty title="No contacts found">Contacts are created automatically from enquiries, inspection bookings, newsletter sign-ups and guide downloads. You can also add or import them.</Empty>}
      </div>
      {modal === 'new' && <NewContact onClose={() => setModal(null)} onDone={id => { setModal(null); router.push(`/admin/email/contacts/${id}`) }} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} onDone={m => { setModal(null); show('ok', m); reload() }} />}
      {modal === 'dupes' && <DuplicatesModal onClose={() => setModal(null)} onMerged={() => { show('ok', 'Contacts merged'); reload() }} />}
    </EmailShell>
  )
}

function NewContact({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [f, setF] = useState({ email: '', name: '', phone: '', kind: 'buyer', tags: '', consentAttested: false, consentNote: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal title="Add a contact" onClose={onClose}>
      <form className="space-y-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('')
        try {
          const r = await send<{ id: string }>('/api/email/contacts', 'POST', { ...f, tags: f.tags.split(',').map(t => t.trim()).filter(Boolean) })
          onDone(r.id)
        } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
      }}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="form-field"><label className="form-label" htmlFor="nc-e">Email</label><input id="nc-e" type="email" required className="form-input" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="nc-n">Name</label><input id="nc-n" className="form-input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="nc-p">Phone</label><input id="nc-p" className="form-input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          <div className="form-field"><label className="form-label" htmlFor="nc-k">Type</label><select id="nc-k" className="form-select" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>{CONTACT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
        </div>
        <div className="form-field"><label className="form-label" htmlFor="nc-t">Tags <span className="form-label-optional">comma separated</span></label><input id="nc-t" className="form-input" value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.consentAttested} onChange={e => setF({ ...f, consentAttested: e.target.checked })} />
          <span>This person has agreed to receive marketing emails from us</span></label>
        {f.consentAttested && <div className="form-field"><label className="form-label" htmlFor="nc-cn">How did they agree?</label><input id="nc-cn" required className="form-input" placeholder="e.g. Signed up at our stand at the Abuja Housing Show, 12 Nov" value={f.consentNote} onChange={e => setF({ ...f, consentNote: e.target.value })} /></div>}
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-md btn-primary" disabled={busy}>Add contact</button></div>
      </form>
    </Modal>
  )
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const [csv, setCsv] = useState('')
  const [kind, setKind] = useState('buyer')
  const [tags, setTags] = useState('')
  const [attested, setAttested] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const rows = csv.trim() ? csv.trim().split(/\r?\n/).length - 1 : 0
  return (
    <Modal title="Import contacts" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-neutral-600">Upload a CSV with a header row. We recognise <code>email</code>, <code>name</code> (or first/last name), <code>phone</code>, <code>kind</code>, <code>tags</code> and <code>birthday</code> (YYYY-MM-DD). Existing contacts are updated, never duplicated.</p>
        <input type="file" accept=".csv,text/csv" onChange={async e => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()) }} className="block text-sm" aria-label="CSV file" />
        {rows > 0 && <p className="text-neutral-500">{rows.toLocaleString()} rows ready</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="form-field"><label className="form-label" htmlFor="im-k">Default type</label><select id="im-k" className="form-select" value={kind} onChange={e => setKind(e.target.value)}>{CONTACT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
          <div className="form-field"><label className="form-label" htmlFor="im-t">Add tags</label><input id="im-t" className="form-input" placeholder="e.g. housing-show-2026" value={tags} onChange={e => setTags(e.target.value)} /></div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
          <p className="text-neutral-700">Imported contacts are <strong>not</strong> subscribed to marketing unless you confirm they agreed. People who previously unsubscribed are never re-subscribed.</p>
          <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={attested} onChange={e => setAttested(e.target.checked)} /><span>Everyone in this file agreed to receive marketing emails from us</span></label>
          {attested && <input className="form-input" placeholder="How and when did they agree?" value={note} onChange={e => setNote(e.target.value)} aria-label="How they agreed" />}
        </div>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <div className="flex justify-end gap-2"><button className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-md btn-primary" disabled={!rows || busy} onClick={async () => {
            setBusy(true); setError('')
            try {
              const r = await send<{ created: number; updated: number; invalid: number; duplicatesInFile: number; subscribed: number; errors: string[] }>('/api/email/contacts/import', 'POST', { csv, kind, tags: tags.split(',').map(t => t.trim()).filter(Boolean), consentAttested: attested, consentNote: note })
              onDone(`Imported: ${r.created} new, ${r.updated} updated, ${r.subscribed} subscribed${r.invalid ? `, ${r.invalid} invalid emails skipped` : ''}${r.duplicatesInFile ? `, ${r.duplicatesInFile} duplicates in file` : ''}.`)
            } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
          }}>{busy ? 'Importing…' : 'Import'}</button></div>
      </div>
    </Modal>
  )
}

function DuplicatesModal({ onClose, onMerged }: { onClose: () => void; onMerged: () => void }) {
  const { data, loading, reload } = useApi<{ key: string; reason: string; contacts: { id: string; email: string; name: string | null; phone: string | null; marketing_status: string; created_at: string }[] }[]>('/api/email/contacts/merge')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Modal title="Possible duplicates" onClose={onClose} wide>
      {loading ? <p className="text-sm text-neutral-400">Checking…</p> : !data?.length ? <p className="text-sm text-neutral-600">No likely duplicates found. (Contacts with the same email are always merged automatically.)</p> : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">Merging keeps the first contact and moves everything from the other into it. If either has unsubscribed, the merged contact stays unsubscribed.</p>
          {error && <p role="alert" className="alert alert-error">{error}</p>}
          {data.map(g => (
            <div key={g.key} className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500 mb-2">{g.reason}</p>
              {g.contacts.slice(1).map(dup => (
                <div key={dup.id} className="flex flex-wrap items-center gap-3 text-sm py-1">
                  <span className="flex-1">Keep <strong>{g.contacts[0].email}</strong>, merge in <strong>{dup.email}</strong></span>
                  <button className="btn btn-sm btn-secondary" disabled={busy} onClick={async () => {
                    setBusy(true); setError('')
                    try { await send('/api/email/contacts/merge', 'POST', { keepId: g.contacts[0].id, mergeId: dup.id }); onMerged(); reload() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
                  }}>Merge</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function Page() {
  return <RequireRole min="admin"><ContactsPage /></RequireRole>
}
