'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole, useAdminUser } from '@/components/admin/AdminNav'
import { AUDIENCE_LABEL, EmailPreview, EmailShell, send, useApi, useToast } from '@/components/admin/email/ui'

interface Tpl { key: string; name: string; category: string; audience: string; subject: string; preheader: string | null; body: string; is_system: boolean; edited: boolean; hasDefault: boolean; usedBy: { id: string; name: string }[] }

const SYNTAX: [string, string][] = [
  ['{{first_name|there}}', 'First name, or “there” if unknown'],
  ['{{property_title}} {{property_price}} {{property_url}}', 'The property'],
  ['{{reference}}', 'Enquiry, inspection or transaction reference'],
  ['{{inspection_date}} {{inspection_time}} {{maps_url}}', 'Inspection details'],
  ['{{agent_name}} {{agent_phone}}', 'Assigned consultant'],
  ['[[property]]', 'Property card with photo, price and facts'],
  ['[[properties]]', 'List of matching or featured properties'],
  ['[[inspection]] [[enquiry]] [[transaction]]', 'Summary tables'],
  ['[[agent]]', 'Consultant contact card'],
  ['[[button Label | {{property_url}}]]', 'Button'],
  ['[[whatsapp]]', 'WhatsApp button'],
  ['[[if property_type=land]] … [[else]] … [[endif]]', 'Show text only in some cases'],
  ['**bold**  [link](https://…)  - list item', 'Formatting'],
]

function TemplateEditor({ tkey }: { tkey: string }) {
  const router = useRouter()
  const user = useAdminUser()
  const { data: t, reload, error } = useApi<Tpl>(`/api/email/templates/${tkey}`)
  const { show, node } = useToast()
  const [f, setF] = useState({ name: '', subject: '', preheader: '', body: '', audience: 'marketing' })
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState<{ html: string; subject: string; preheader: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [testTo, setTestTo] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (t && !dirty) setF({ name: t.name, subject: t.subject, preheader: t.preheader || '', body: t.body, audience: t.audience }) }, [t, dirty])
  useEffect(() => { if (user?.email && !testTo) setTestTo(user.email) }, [user, testTo])

  const renderPreview = useCallback(async (v: typeof f) => {
    try { setPreview(await send(`/api/email/templates/${tkey}`, 'POST', { subject: v.subject, preheader: v.preheader, body: v.body })) } catch { /* keep last preview */ }
  }, [tkey])
  // Live preview, debounced while typing
  useEffect(() => {
    if (!f.body) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => renderPreview(f), 500)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [f, renderPreview])

  if (error) return <EmailShell title="Template"><p className="alert alert-error">{error}</p></EmailShell>
  if (!t) return <EmailShell title="Template"><p className="text-sm text-neutral-400 animate-pulse">Loading…</p></EmailShell>
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setDirty(true) }

  const save = async () => {
    setBusy(true)
    try { await send(`/api/email/templates/${tkey}`, 'PUT', f); setDirty(false); show('ok', 'Template saved'); reload() } catch (e) { show('error', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <EmailShell title={f.name || t.name} description={`${AUDIENCE_LABEL[t.audience]}${t.usedBy.length ? ` · Used by: ${t.usedBy.map(u => u.name).join(', ')}` : ''}`}
      actions={<>
        <button className="btn btn-md btn-primary" disabled={!dirty || busy} onClick={save}>{dirty ? 'Save' : 'Saved'}</button>
        <button className="btn btn-md btn-secondary" disabled={busy} onClick={async () => {
          try { const c = await send<{ key: string }>('/api/email/templates', 'POST', { fromKey: tkey }); router.push(`/admin/email/templates/${c.key}`) } catch (e) { show('error', (e as Error).message) }
        }}>Duplicate</button>
        {t.hasDefault && t.edited && <button className="btn btn-md btn-ghost" disabled={busy} onClick={async () => { if (confirm('Restore the original wording? Your edits will be lost.')) { await send(`/api/email/templates/${tkey}`, 'PUT', { reset: true }); setDirty(false); show('ok', 'Restored'); reload() } }}>Reset to original</button>}
        {!t.is_system && <button className="btn btn-md btn-danger-ghost" onClick={async () => { if (confirm('Delete this template?')) { try { await send(`/api/email/templates/${tkey}`, 'DELETE'); router.push('/admin/email/templates') } catch (e) { show('error', (e as Error).message) } } }}>Delete</button>}
      </>}>
      {node}
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <section className="card p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="form-field"><label className="form-label" htmlFor="te-n">Name</label><input id="te-n" className="form-input" value={f.name} onChange={e => set('name', e.target.value)} /></div>
              <div className="form-field"><label className="form-label" htmlFor="te-a">Type</label>
                <select id="te-a" className="form-select" disabled={t.is_system} value={f.audience} onChange={e => set('audience', e.target.value)}>
                  {Object.entries(AUDIENCE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
            </div>
            <div className="form-field"><label className="form-label" htmlFor="te-s">Subject</label><input id="te-s" className="form-input" value={f.subject} onChange={e => set('subject', e.target.value)} /></div>
            <div className="form-field"><label className="form-label" htmlFor="te-p">Preview text <span className="form-label-optional">optional</span></label><input id="te-p" className="form-input" value={f.preheader} onChange={e => set('preheader', e.target.value)} /></div>
            <div className="form-field"><label className="form-label" htmlFor="te-b">Body</label>
              <textarea id="te-b" rows={22} spellCheck className="form-input form-textarea font-mono text-[13px] leading-relaxed" value={f.body} onChange={e => set('body', e.target.value)} /></div>
          </section>
          <details className="card p-5">
            <summary className="font-medium text-ink cursor-pointer">What you can use in a template</summary>
            <dl className="mt-3 grid gap-2 text-sm">
              {SYNTAX.map(([code, what]) => <div key={code} className="grid sm:grid-cols-[1fr_1fr] gap-2"><dt><code className="text-xs bg-neutral-100 rounded px-1.5 py-0.5 break-all">{code}</code></dt><dd className="text-neutral-600">{what}</dd></div>)}
            </dl>
            <p className="text-xs text-neutral-500 mt-3">Values are filled in from the database when each email is sent. A variable with no value is left blank (or uses the fallback after “|”). The footer, unsubscribe link and branding are added automatically.</p>
          </details>
          <section className="card p-5 space-y-2">
            <h2 className="font-medium text-ink">Send a test</h2>
            <div className="flex gap-2">
              <label htmlFor="te-t" className="sr-only">Test address</label>
              <input id="te-t" type="email" className="form-input" value={testTo} onChange={e => setTestTo(e.target.value)} />
              <button className="btn btn-md btn-secondary shrink-0" disabled={busy || dirty} title={dirty ? 'Save first' : undefined}
                onClick={async () => { try { await send(`/api/email/templates/${tkey}`, 'POST', { action: 'test', to: testTo }); show('ok', `Test queued to ${testTo}`) } catch (e) { show('error', (e as Error).message) } }}>Send test</button>
            </div>
            <p className="text-xs text-neutral-500">Uses your newest listing as sample data. Check the <Link href="/admin/email/log" className="underline">delivery log</Link> if it doesn’t arrive.</p>
          </section>
        </div>
        <div className="xl:sticky xl:top-20 self-start">
          {preview ? <EmailPreview html={preview.html} subject={preview.subject} preheader={preview.preheader} /> : <p className="text-sm text-neutral-400">Rendering preview…</p>}
          <p className="text-xs text-neutral-500 mt-2">Preview uses your newest listing and sample names. Real emails use the actual person, property and booking.</p>
        </div>
      </div>
    </EmailShell>
  )
}

export default function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  return <RequireRole min="admin"><TemplateEditor tkey={key} /></RequireRole>
}
