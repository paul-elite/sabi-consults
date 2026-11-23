'use client'

import { useEffect, useState } from 'react'
import { RequireRole } from '@/components/admin/AdminNav'
import { EmailShell, StatusBadge, fmtDateTime, send, useApi, useToast } from '@/components/admin/email/ui'

interface S {
  settings: { senderName: string; senderAddress: string; replyTo: string; doubleOptIn: boolean; trackOpens: boolean; batchSize: number; dailyLimit: number; notifyRecipients: string[]; unassignedHours: number; reminderHours: number; dayOfHours: number; reactivationDays: number; brandName: string }
  provider: { apiKey: boolean; webhookSecret: boolean; cronSecret: boolean; siteUrl: string; siteUrlExplicit: boolean }
  endpoints: { webhook: string; worker: string }
  domains: { ok: boolean; error?: string; domains?: { name: string; status: string; records?: { record: string; name: string; type: string; value: string; status: string; priority?: number }[] }[] } | null
  scoring: { signal: string; label: string; points: number; max_points: number | null; active: boolean }[]
  leadMagnets: { id: string; slug: string; title: string; description: string | null; file_url: string | null; active: boolean; request_count: number }[]
  workerRuns: { started_at: string; finished_at: string | null; ok: boolean | null; error: string | null; stats: Record<string, unknown> }[]
  lastWebhookAt: string | null
}

function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: React.ReactNode }) {
  return <li className="flex gap-3 py-2"><span aria-hidden="true">{ok ? '✅' : '⚪️'}</span><div><p className={ok ? 'text-ink' : 'text-ink font-medium'}>{label}</p>{detail && <div className="text-xs text-neutral-500 mt-0.5">{detail}</div>}</div></li>
}

function SettingsPage() {
  const [withDomains, setWithDomains] = useState(false)
  const { data, reload } = useApi<S>(`/api/email/settings${withDomains ? '?domains=1' : ''}`, [withDomains])
  const { show, node } = useToast()
  const [f, setF] = useState<Record<string, string | boolean>>({})
  const [scoring, setScoring] = useState<S['scoring']>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!data) return
    const s = data.settings
    setF({ senderName: s.senderName, senderAddress: s.senderAddress, replyTo: s.replyTo, doubleOptIn: s.doubleOptIn, trackOpens: s.trackOpens, batchSize: String(s.batchSize), dailyLimit: String(s.dailyLimit), notifyRecipients: s.notifyRecipients.join(', '), unassignedHours: String(s.unassignedHours), reminderHours: String(s.reminderHours), dayOfHours: String(s.dayOfHours), reactivationDays: String(s.reactivationDays) })
    setScoring(data.scoring)
  }, [data])
  if (!data) return <EmailShell title="Email settings"><p className="text-sm text-neutral-400 animate-pulse">Loading…</p></EmailShell>

  const save = async (body: Record<string, unknown>, ok = 'Settings saved') => {
    setBusy(true)
    try { await send('/api/email/settings', 'PUT', body); show('ok', ok); reload() } catch (e) { show('error', (e as Error).message) } finally { setBusy(false) }
  }
  const field = (k: string, label: string, opts: { type?: string; help?: string; placeholder?: string } = {}) => (
    <div className="form-field">
      <label className="form-label" htmlFor={`s-${k}`}>{label}</label>
      <input id={`s-${k}`} type={opts.type || 'text'} className="form-input" placeholder={opts.placeholder} value={String(f[k] ?? '')} onChange={e => setF({ ...f, [k]: e.target.value })} />
      {opts.help && <p className="form-helper">{opts.help}</p>}
    </div>
  )
  const lastRun = data.workerRuns[0]
  const workerOk = !!lastRun && Date.now() - new Date(lastRun.started_at).getTime() < 10 * 60_000
  const p = data.provider

  return (
    <EmailShell title="Email settings" description="Sender identity, delivery, timing and integrations. Secret keys are kept on the server and never shown here.">
      {node}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5 space-y-4">
          <h2 className="font-medium text-ink">Sender</h2>
          {field('senderName', 'Sender name', { help: 'Shown as “From” in the inbox.' })}
          {field('senderAddress', 'Sender address', { type: 'email', placeholder: 'hello@sabiconsults.com.ng', help: 'Must be on a domain verified in Resend (with SPF and DKIM), otherwise emails are rejected.' })}
          {field('replyTo', 'Reply-to address', { type: 'email', help: 'Where replies go, e.g. your Google Workspace inbox.' })}
          {field('notifyRecipients', 'Team notifications go to', { help: 'Comma-separated. Used when a lead has no assigned agent. Leave blank to notify all admins.' })}
          <button className="btn btn-md btn-primary" disabled={busy} onClick={() => save({ settings: { senderName: f.senderName, senderAddress: f.senderAddress, replyTo: f.replyTo, notifyRecipients: f.notifyRecipients } })}>Save sender</button>
        </section>

        <section className="card p-5">
          <h2 className="font-medium text-ink mb-2">Connection status</h2>
          <ul className="divide-y divide-neutral-100 text-sm">
            <Check ok={p.apiKey} label="Resend API key (RESEND_API_KEY)" detail={!p.apiKey && 'Create a key at resend.com → API Keys and add it to Vercel → Settings → Environment Variables, then redeploy.'} />
            <Check ok={!!data.settings.senderAddress} label="Sender address" />
            <Check ok={p.webhookSecret} label="Delivery webhook (RESEND_WEBHOOK_SECRET)" detail={<>In Resend → Webhooks, add <code className="break-all">{data.endpoints.webhook}</code> for all email events, then copy its signing secret into Vercel.{data.lastWebhookAt && <> Last event {fmtDateTime(data.lastWebhookAt)}.</>}</>} />
            <Check ok={p.cronSecret && workerOk} label="Background worker" detail={<>{p.cronSecret ? '' : 'Set CRON_SECRET in Vercel. '}Supabase runs it every minute{lastRun ? `; last run ${fmtDateTime(lastRun.started_at)}${lastRun.ok === false ? ` (failed: ${lastRun.error})` : ''}` : '; it hasn’t run yet'}.</>} />
            <Check ok={p.siteUrlExplicit} label="Website address for links (NEXT_PUBLIC_SITE_URL)" detail={`Links currently point to ${p.siteUrl}`} />
          </ul>
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="btn btn-sm btn-secondary" disabled={busy} onClick={async () => { setBusy(true); try { const r = await send<{ ok: boolean; ms: number; error?: string }>('/api/email/worker', 'POST'); show(r.ok ? 'ok' : 'error', r.ok ? `Worker ran in ${r.ms} ms` : r.error || 'Failed'); reload() } catch (e) { show('error', (e as Error).message) } finally { setBusy(false) } }}>Run worker now</button>
            {p.apiKey && <button className="btn btn-sm btn-secondary" onClick={() => setWithDomains(true)}>Check domain (SPF / DKIM)</button>}
          </div>
          {data.domains && (
            <div className="mt-4 text-sm">
              {!data.domains.ok ? <p className="text-red-600">{data.domains.error}</p> : !data.domains.domains?.length ? <p>No domain added in Resend yet. Add your domain there to get the DNS records.</p> : data.domains.domains.map(dm => (
                <div key={dm.name} className="mb-3">
                  <p className="font-medium">{dm.name} <StatusBadge status={dm.status === 'verified' ? 'delivered' : 'pending'} label={dm.status} /></p>
                  <div className="table-container mt-2"><table className="table text-xs"><thead><tr><th>Purpose</th><th>Type</th><th>Name</th><th>Value</th><th>Status</th></tr></thead>
                    <tbody>{(dm.records || []).map((r, i) => <tr key={i}><td>{r.record}</td><td>{r.type}</td><td className="break-all">{r.name}</td><td className="break-all max-w-[240px]">{r.value}</td><td>{r.status}</td></tr>)}</tbody></table></div>
                </div>
              ))}
              <p className="text-xs text-neutral-500">Also add a DMARC record at your DNS host: <code>_dmarc</code> TXT <code>v=DMARC1; p=none; rua=mailto:{data.settings.replyTo || 'you@yourdomain'}</code>, tightening to p=quarantine once delivery looks healthy.</p>
            </div>
          )}
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="font-medium text-ink">Consent and delivery</h2>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!f.doubleOptIn} onChange={e => setF({ ...f, doubleOptIn: e.target.checked })} />
            <span><strong>Double opt-in</strong><br /><span className="text-neutral-500">New subscribers confirm by email before receiving marketing. Recommended for NDPA compliance and deliverability.</span></span></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!f.trackOpens} onChange={e => setF({ ...f, trackOpens: e.target.checked })} />
            <span><strong>Estimate opens</strong><br /><span className="text-neutral-500">Adds an invisible image. Clicks are always tracked.</span></span></label>
          <div className="grid grid-cols-2 gap-3">
            {field('batchSize', 'Emails per worker run', { type: 'number', help: 'Max 200. About 100 per minute fits Resend’s default rate limit.' })}
            {field('dailyLimit', 'Daily limit (marketing & follow-ups)', { type: 'number', help: 'Transactional and team emails are never limited.' })}
          </div>
          <button className="btn btn-md btn-primary" disabled={busy} onClick={() => save({ settings: { doubleOptIn: f.doubleOptIn, trackOpens: f.trackOpens, batchSize: Number(f.batchSize), dailyLimit: Number(f.dailyLimit) } })}>Save</button>
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="font-medium text-ink">Timing</h2>
          <div className="grid grid-cols-2 gap-3">
            {field('reminderHours', 'First inspection reminder (hours before)', { type: 'number' })}
            {field('dayOfHours', 'Day-of reminder (hours before)', { type: 'number' })}
            {field('unassignedHours', 'Alert if a new lead is unassigned after (hours)', { type: 'number' })}
            {field('reactivationDays', 'Re-engage subscribers inactive for (days)', { type: 'number' })}
          </div>
          <button className="btn btn-md btn-primary" disabled={busy} onClick={() => save({ settings: { reminderHours: Number(f.reminderHours), dayOfHours: Number(f.dayOfHours), unassignedHours: Number(f.unassignedHours), reactivationDays: Number(f.reactivationDays) } })}>Save timing</button>
        </section>

        <section className="card p-5 space-y-3 lg:col-span-2">
          <h2 className="font-medium text-ink">Lead scoring</h2>
          <p className="text-sm text-neutral-500">Points add up to a score; 12+ is warm, 30+ is hot. Email opens aren’t used because they’re unreliable.</p>
          <div className="table-container"><table className="table">
            <thead><tr><th>Signal</th><th>Points each</th><th>Maximum</th><th>On</th></tr></thead>
            <tbody>{scoring.map((r, i) => (
              <tr key={r.signal}>
                <td className="text-sm">{r.label}</td>
                <td><input aria-label={`Points for ${r.label}`} type="number" className="form-input h-9 w-24" value={r.points} onChange={e => setScoring(scoring.map((x, j) => j === i ? { ...x, points: Number(e.target.value) } : x))} /></td>
                <td><input aria-label={`Maximum for ${r.label}`} type="number" className="form-input h-9 w-24" value={r.max_points ?? ''} placeholder="none" onChange={e => setScoring(scoring.map((x, j) => j === i ? { ...x, max_points: e.target.value === '' ? null : Number(e.target.value) } : x))} /></td>
                <td><input aria-label={`Use ${r.label}`} type="checkbox" checked={r.active} onChange={e => setScoring(scoring.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} /></td>
              </tr>
            ))}</tbody>
          </table></div>
          <button className="btn btn-md btn-primary" disabled={busy} onClick={() => save({ scoring }, 'Scoring saved and recent leads re-scored')}>Save scoring</button>
        </section>

        <section className="card p-5 space-y-3 lg:col-span-2">
          <h2 className="font-medium text-ink">Downloadable guides</h2>
          <p className="text-sm text-neutral-500">Upload a PDF for each guide and switch it on. Only guides with a file appear on the <a href="/guides" target="_blank" className="underline">guides page</a>.</p>
          <ul className="divide-y divide-neutral-100">
            {data.leadMagnets.map(g => <GuideRow key={g.id} g={g} onSaved={m => { show('ok', m); reload() }} onError={m => show('error', m)} />)}
          </ul>
        </section>
      </div>
    </EmailShell>
  )
}

function GuideRow({ g, onSaved, onError }: { g: S['leadMagnets'][number]; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false)
  const upload = async (file: File) => {
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('folder', 'guides')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      await send('/api/email/lead-magnets', 'PUT', { id: g.id, fileUrl: data.url })
      onSaved('File attached')
    } catch (e) { onError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <li className="py-3 flex flex-wrap items-center gap-3 text-sm">
      <div className="flex-1 min-w-[240px]"><p className="font-medium text-ink">{g.title}</p><p className="text-xs text-neutral-500">{g.file_url ? <a href={g.file_url} target="_blank" rel="noreferrer" className="underline">File attached</a> : 'No file yet'} · {g.request_count} requests</p></div>
      <label className="btn btn-sm btn-secondary cursor-pointer">{busy ? 'Uploading…' : g.file_url ? 'Replace PDF' : 'Upload PDF'}<input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} /></label>
      <button className="btn btn-sm btn-ghost" disabled={busy || (!g.file_url && !g.active)} onClick={async () => { try { await send('/api/email/lead-magnets', 'PUT', { id: g.id, active: !g.active }); onSaved(g.active ? 'Guide hidden' : 'Guide is live') } catch (e) { onError((e as Error).message) } }}>{g.active ? 'Hide' : 'Publish'}</button>
      <StatusBadge status={g.active ? 'active' : 'draft'} label={g.active ? 'Live' : 'Hidden'} />
    </li>
  )
}

export default function Page() {
  return <RequireRole min="admin"><SettingsPage /></RequireRole>
}
