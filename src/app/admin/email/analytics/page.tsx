'use client'

import Link from 'next/link'
import { useState } from 'react'
import { RequireRole } from '@/components/admin/AdminNav'
import { DateRange, EmailShell, Stat, defaultRange, naira, pct, useApi } from '@/components/admin/email/ui'
import { DEFAULT_TEMPLATES } from '@/lib/email/defaults'

interface Data {
  totals: Record<string, number>
  conversions: Record<string, number>
  transaction_value: { direct: number; assisted: number }
  daily: { day: string; sent: number; clicked: number }[]
  subscriber_growth: { day: string; joined: number; left: number }[]
  campaigns: { id: string; name: string; status: string; started_at: string | null; sent: number; delivered: number; bounced: number; opened: number; clicked: number; enquiries: number; inspections: number; transactions_direct: number; transactions_assisted: number }[]
  templates: { key: string; sent: number; clicked: number; opened: number }[]
  automations: { id: string; name: string; sent: number; clicked: number; enquiries: number; inspections: number; transactions_direct: number; transactions_assisted: number }[]
  properties: { id: string; title: string; district: string; emails: number; clicks: number }[]
  sources: { source: string; leads: number; inspections: number; converted: number; avg_score: number | null }[]
  segments: { kind: string; contacts: number; subscribed: number; clicked: number; converted: number }[]
  agents: { id: string; name: string; leads: number; contacted: number; median_hours_to_contact: number | null; inspections: number; converted: number }[]
}

const tplName = (k: string) => DEFAULT_TEMPLATES.find(t => t.key === k)?.name || k.replace(/^custom_/, '').replace(/_/g, ' ')
const delta = (now: number, before?: number) => before === undefined ? null : before === 0 ? (now ? 'new' : null) : `${now >= before ? '+' : ''}${Math.round(((now - before) / before) * 100)}% vs previous period`

function Bars({ rows }: { rows: { day: string; a: number; b: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.a))
  if (!rows.length) return <p className="text-sm text-neutral-500 py-8 text-center">No emails sent in this period.</p>
  return (
    <div>
      <div className="flex items-end gap-[2px] h-40" role="img" aria-label="Emails sent and clicked per day">
        {rows.map(r => (
          <div key={r.day} className="flex-1 flex flex-col justify-end gap-[1px] min-w-[3px]" title={`${r.day}: ${r.a} sent, ${r.b} clicked`}>
            <div className="bg-[#0055cc]/25 rounded-t-sm" style={{ height: `${((r.a - r.b) / max) * 100}%` }} />
            <div className="bg-[#0055cc] rounded-b-sm" style={{ height: `${(r.b / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-neutral-400 mt-1"><span>{rows[0].day}</span><span>{rows[rows.length - 1].day}</span></div>
      <p className="text-xs text-neutral-500 mt-2 flex gap-4"><span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#0055cc]/25" />Sent</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#0055cc]" />Clicked</span></p>
    </div>
  )
}

function AnalyticsPage() {
  const [range, setRange] = useState(defaultRange())
  const [campaign, setCampaign] = useState('')
  const qs = `from=${range.from}&to=${range.to}${campaign ? `&campaign=${campaign}` : ''}`
  const { data: res, loading, error } = useApi<{ data: Data; previous: Record<string, number> | null; campaigns: { id: string; name: string }[] }>(`/api/email/analytics?${qs}`, [qs])
  const d = res?.data
  const t = d?.totals || {}
  const prev = res?.previous || undefined
  const c = d?.conversions || {}

  return (
    <EmailShell title="Email analytics" description="Business results first: enquiries, inspections and sales that followed a tracked email click. Opens are shown as an estimate only.">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
        <div><label htmlFor="ac" className="sr-only">Campaign</label>
          <select id="ac" className="form-select h-9 py-0 w-auto" value={campaign} onChange={e => setCampaign(e.target.value)}>
            <option value="">All email</option>{(res?.campaigns || []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select></div>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {loading && !d ? <p className="text-sm text-neutral-400 animate-pulse">Loading…</p> : d && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Enquiries from email" value={(c.enquiry_direct || 0) + (c.lead_direct || 0)} sub={`+ ${(c.enquiry_assisted || 0) + (c.lead_assisted || 0)} assisted`} hint="Direct: within 7 days of clicking an email. Assisted: clicked an email in the previous 30 days, came back another way." />
            <Stat label="Inspections from email" value={c.inspection_direct || 0} sub={`+ ${c.inspection_assisted || 0} assisted`} />
            <Stat label="Sales from email" value={c.transaction_direct || 0} sub={`+ ${c.transaction_assisted || 0} assisted`} hint="A sale is never credited to email just because the buyer received one; they must have clicked." />
            <Stat label="Sales value" value={naira(d.transaction_value.direct)} sub={`${naira(d.transaction_value.assisted)} assisted`} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Stat label="Sent" value={(t.sent || 0).toLocaleString()} sub={delta(t.sent || 0, prev?.sent) || undefined} />
            <Stat label="Delivered" value={pct(t.delivered || 0, t.sent || 0)} />
            <Stat label="Click rate" value={pct(t.clicked || 0, t.sent || 0)} sub={delta(t.clicked || 0, prev?.clicked) || undefined} />
            <Stat label="Bounce rate" value={pct(t.bounced || 0, t.sent || 0)} />
            <Stat label="Spam complaints" value={t.complained || 0} />
            <Stat label="Open rate (est.)" tone="muted" value={pct(t.opened || 0, t.sent || 0)} hint="Unreliable: Apple Mail Privacy Protection and Gmail image proxies open emails automatically." />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="card p-5 lg:col-span-2"><h2 className="font-medium text-ink mb-4">Daily sends and clicks</h2><Bars rows={d.daily.map(r => ({ day: r.day, a: r.sent, b: r.clicked }))} /></section>
            <section className="card p-5">
              <h2 className="font-medium text-ink mb-3">Subscriber growth</h2>
              <p className="text-3xl font-semibold">{(t.new_subscribers || 0) - (t.unsubscribes || 0) >= 0 ? '+' : ''}{(t.new_subscribers || 0) - (t.unsubscribes || 0)}</p>
              <p className="text-sm text-neutral-500">{t.new_subscribers || 0} joined · {t.unsubscribes || 0} left</p>
              <ul className="mt-3 text-xs text-neutral-500 max-h-40 overflow-y-auto space-y-0.5">{d.subscriber_growth.map(g => <li key={g.day} className="flex justify-between"><span>{g.day}</span><span>+{g.joined} / −{g.left}</span></li>)}</ul>
            </section>
          </div>

          <section className="card overflow-hidden">
            <div className="card-header"><h2 className="font-medium text-ink">Campaigns</h2></div>
            <div className="table-container"><table className="table">
              <thead><tr><th>Campaign</th><th>Sent</th><th>Delivered</th><th>Clicked</th><th>Enquiries</th><th>Inspections</th><th>Sales (direct + assisted)</th><th>Opens (est.)</th></tr></thead>
              <tbody>{d.campaigns.map(x => <tr key={x.id}><td><Link className="hover:underline" href={`/admin/email/campaigns/${x.id}`}>{x.name}</Link></td><td>{x.sent}</td><td>{pct(x.delivered, x.sent)}</td><td>{pct(x.clicked, x.sent)}</td><td>{x.enquiries}</td><td>{x.inspections}</td><td>{x.transactions_direct} + {x.transactions_assisted}</td><td className="text-neutral-400">{pct(x.opened, x.sent)}</td></tr>)}
                {!d.campaigns.length && <tr><td colSpan={8} className="text-neutral-500">No campaigns in this period.</td></tr>}</tbody>
            </table></div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card overflow-hidden">
              <div className="card-header"><h2 className="font-medium text-ink">Workflows</h2></div>
              <div className="table-container"><table className="table">
                <thead><tr><th>Workflow</th><th>Sent</th><th>Clicked</th><th>Enquiries</th><th>Inspections</th><th>Sales</th></tr></thead>
                <tbody>{d.automations.filter(a => a.sent).map(a => <tr key={a.id}><td><Link className="hover:underline" href={`/admin/email/automations/${a.id}`}>{a.name}</Link></td><td>{a.sent}</td><td>{pct(a.clicked, a.sent)}</td><td>{a.enquiries}</td><td>{a.inspections}</td><td>{a.transactions_direct} + {a.transactions_assisted}</td></tr>)}
                  {!d.automations.some(a => a.sent) && <tr><td colSpan={6} className="text-neutral-500">No workflow emails in this period.</td></tr>}</tbody>
              </table></div>
            </section>
            <section className="card overflow-hidden">
              <div className="card-header"><h2 className="font-medium text-ink">Top templates (by clicks)</h2></div>
              <div className="table-container"><table className="table">
                <thead><tr><th>Template</th><th>Sent</th><th>Click rate</th></tr></thead>
                <tbody>{d.templates.filter(x => x.sent).slice(0, 10).map(x => <tr key={x.key}><td><Link className="hover:underline" href={`/admin/email/templates/${x.key}`}>{tplName(x.key)}</Link></td><td>{x.sent}</td><td>{pct(x.clicked, x.sent)}</td></tr>)}</tbody>
              </table></div>
            </section>
            <section className="card overflow-hidden">
              <div className="card-header"><h2 className="font-medium text-ink">Listings that get clicked</h2></div>
              <div className="table-container"><table className="table">
                <thead><tr><th>Property</th><th>Emails</th><th>Clicks</th></tr></thead>
                <tbody>{d.properties.map(p => <tr key={p.id}><td>{p.title}<span className="block text-xs text-neutral-500">{p.district}</span></td><td>{p.emails}</td><td>{p.clicks}</td></tr>)}
                  {!d.properties.length && <tr><td colSpan={3} className="text-neutral-500">No property emails yet.</td></tr>}</tbody>
              </table></div>
            </section>
            <section className="card overflow-hidden">
              <div className="card-header"><h2 className="font-medium text-ink">Audience segments</h2></div>
              <div className="table-container"><table className="table">
                <thead><tr><th>Type</th><th>Contacts</th><th>Subscribed</th><th>Clicked</th><th>Converted</th></tr></thead>
                <tbody>{d.segments.map(s => <tr key={s.kind}><td className="capitalize">{s.kind}</td><td>{s.contacts}</td><td>{s.subscribed}</td><td>{s.clicked}</td><td>{s.converted}</td></tr>)}</tbody>
              </table></div>
            </section>
            <section className="card overflow-hidden">
              <div className="card-header"><h2 className="font-medium text-ink">Lead sources (quality)</h2></div>
              <div className="table-container"><table className="table">
                <thead><tr><th>Source</th><th>Leads</th><th>Inspection rate</th><th>Converted</th><th>Avg score</th></tr></thead>
                <tbody>{d.sources.map(s => <tr key={s.source}><td className="capitalize">{s.source.replace(/_/g, ' ')}</td><td>{s.leads}</td><td>{pct(s.inspections, s.leads)}</td><td>{s.converted}</td><td>{s.avg_score ?? '–'}</td></tr>)}
                  {!d.sources.length && <tr><td colSpan={5} className="text-neutral-500">No leads in this period.</td></tr>}</tbody>
              </table></div>
            </section>
            <section className="card overflow-hidden">
              <div className="card-header"><h2 className="font-medium text-ink">Agent follow-up</h2></div>
              <div className="table-container"><table className="table">
                <thead><tr><th>Agent</th><th>Leads</th><th>Contacted</th><th>Median time to contact</th><th>Inspections</th><th>Converted</th></tr></thead>
                <tbody>{d.agents.map(a => <tr key={a.id}><td>{a.name}</td><td>{a.leads}</td><td>{pct(a.contacted, a.leads)}</td><td>{a.median_hours_to_contact != null ? `${a.median_hours_to_contact}h` : '–'}</td><td>{a.inspections}</td><td>{a.converted}</td></tr>)}
                  {!d.agents.length && <tr><td colSpan={6} className="text-neutral-500">No assigned leads in this period.</td></tr>}</tbody>
              </table></div>
              <p className="px-5 py-3 text-xs text-neutral-500">Time to contact is measured from assignment to the agent’s first status change or email.</p>
            </section>
          </div>
        </div>
      )}
    </EmailShell>
  )
}

export default function Page() {
  return <RequireRole min="admin"><AnalyticsPage /></RequireRole>
}
