'use client'

import Link from 'next/link'
import { useState } from 'react'
import { RequireRole } from '@/components/admin/AdminNav'
import { DateRange, EmailShell, Stat, StatusBadge, defaultRange, fmtDateTime, pct, useApi } from '@/components/admin/email/ui'

interface Overview {
  analytics: {
    totals: Record<string, number>
    conversions: Record<string, number>
    transaction_value: { direct: number; assisted: number }
    campaigns: { id: string; name: string; status: string; sent: number; clicked: number; enquiries: number; inspections: number }[]
  }
  audience: { total: number; subscribed: number; pending: number; unsubscribed: number; suppressed: number }
  queue: { pending: number; failed: number; failedRuns: number; heldReason: string | null }
  health: { apiKey: boolean; webhookSecret: boolean; cronSecret: boolean; siteUrl: string; siteUrlExplicit: boolean; senderAddress: string | null; lastWorker: { started_at: string; ok: boolean | null; error: string | null } | null; lastWebhookAt: string | null }
  recent: { id: string; to_email: string; category: string; template_key: string; subject: string | null; status: string; status_reason: string | null; created_at: string; sent_at: string | null }[]
}

function OverviewPage() {
  const [range, setRange] = useState(defaultRange())
  const { data, loading, error } = useApi<Overview>(`/api/email/overview?from=${range.from}&to=${range.to}`, [range.from, range.to])

  const t = data?.analytics.totals || {}
  const conv = data?.analytics.conversions || {}
  const h = data?.health
  const workerFresh = h?.lastWorker && Date.now() - new Date(h.lastWorker.started_at).getTime() < 10 * 60_000
  const checklist = h ? [
    { ok: h.apiKey, label: 'Email provider connected', fix: 'Add RESEND_API_KEY in Vercel environment variables' },
    { ok: !!h.senderAddress, label: 'Sender address set', fix: 'Set it in Email settings (must be on a domain verified in Resend)' },
    { ok: h.webhookSecret, label: 'Delivery tracking (webhooks) configured', fix: 'Add RESEND_WEBHOOK_SECRET and the webhook URL in Resend' },
    { ok: h.cronSecret && !!workerFresh, label: 'Background sending running', fix: h.cronSecret ? 'The scheduler hasn’t run in the last 10 minutes' : 'Add CRON_SECRET and the scheduled job (see Email settings)' },
    { ok: h.siteUrlExplicit, label: 'Website address set for links', fix: `Set NEXT_PUBLIC_SITE_URL (links currently use ${h.siteUrl})` },
  ] : []
  const setupDone = checklist.every(c => c.ok)

  return (
    <EmailShell title="Email & marketing" description="How email is supporting enquiries, inspections and sales."
      actions={<><Link href="/admin/email/campaigns" className="btn btn-md btn-primary">New campaign</Link><Link href="/admin/email/contacts" className="btn btn-md btn-secondary">Contacts</Link></>}>
      {error && <p role="alert" className="alert alert-error mb-4">{error}</p>}

      {data && !setupDone && (
        <section className="card p-5 mb-6 border-amber-200 bg-amber-50/40" aria-labelledby="setup-h">
          <h2 id="setup-h" className="font-semibold text-ink mb-1">Finish setting up email</h2>
          <p className="text-sm text-neutral-600 mb-3">Until these are done, emails are recorded and held in the queue rather than sent.{data.queue.heldReason ? ` (${data.queue.heldReason})` : ''}</p>
          <ul className="space-y-1.5 text-sm">
            {checklist.map(c => (
              <li key={c.label} className="flex gap-2"><span aria-hidden="true">{c.ok ? '✅' : '⚪️'}</span><span><span className={c.ok ? 'text-neutral-500' : 'text-ink font-medium'}>{c.label}</span>{!c.ok && <span className="text-neutral-500"> · {c.fix}</span>}</span></li>
            ))}
          </ul>
          <Link href="/admin/email/settings" className="inline-block mt-3 text-sm text-[#0055cc] hover:underline">Open email settings</Link>
        </section>
      )}

      <div className="flex justify-end mb-4"><DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} /></div>

      {loading && !data ? <p className="text-sm text-neutral-400 animate-pulse">Loading…</p> : data && (
        <>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Audience (now)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Stat label="Contacts" value={data.audience.total.toLocaleString()} />
            <Stat label="Subscribed" value={data.audience.subscribed.toLocaleString()} hint="Agreed to marketing email and not suppressed" sub={data.audience.pending ? `${data.audience.pending} awaiting confirmation` : undefined} />
            <Stat label="New contacts" value={(t.new_contacts || 0).toLocaleString()} sub="in this period" />
            <Stat label="New leads" value={(t.new_leads || 0).toLocaleString()} sub="in this period" />
          </div>

          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">What email produced</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <Stat label="Enquiries" value={(conv.enquiry_direct || 0) + (conv.lead_direct || 0)} hint="Submitted within 7 days of clicking one of our emails" sub={`+ ${(conv.enquiry_assisted || 0) + (conv.lead_assisted || 0)} assisted`} />
            <Stat label="Inspections" value={conv.inspection_direct || 0} hint="Booked within 7 days of an email click" sub={`+ ${conv.inspection_assisted || 0} assisted`} />
            <Stat label="Sales" value={conv.transaction_direct || 0} hint="Direct: the lead came from an email click. Assisted: they clicked an email in the 90 days before buying" sub={`+ ${conv.transaction_assisted || 0} assisted`} />
            <Stat label="Clicks" value={(t.clicked || 0).toLocaleString()} sub={`${pct(t.clicked || 0, t.sent || 0)} of emails sent`} />
          </div>
          <p className="text-xs text-neutral-500 mb-8">Measured from tracked clicks, never from simply receiving an email. “Assisted” means the person clicked one of our emails earlier but came back another way.</p>

          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Delivery</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Stat label="Sent" value={(t.sent || 0).toLocaleString()} sub={t.queued ? `${t.queued} waiting` : undefined} />
            <Stat label="Delivered" value={pct(t.delivered || 0, t.sent || 0)} hint="Needs the Resend webhook; shows – until it is set up" />
            <Stat label="Bounced" value={pct(t.bounced || 0, t.sent || 0)} />
            <Stat label="Opened" tone="muted" value={pct(t.opened || 0, t.sent || 0)} hint="Estimate only: Apple Mail and Gmail load images automatically, so opens are over-counted" sub="estimate" />
            <Stat label="Unsubscribed" value={pct(t.unsubscribes || 0, t.marketing_sent || 0)} sub={`${t.unsubscribes || 0} people`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card">
              <div className="card-header flex items-center justify-between"><h2 className="font-medium text-ink">Recent emails</h2><Link href="/admin/email/log" className="text-sm text-[#0055cc]">Delivery log</Link></div>
              <ul className="divide-y divide-neutral-100">
                {data.recent.map(m => (
                  <li key={m.id} className="px-5 py-3 text-sm flex items-center gap-3">
                    <div className="min-w-0 flex-1"><p className="truncate text-ink">{m.subject || m.template_key.replace(/_/g, ' ')}</p><p className="text-xs text-neutral-500 truncate">{m.to_email} · {fmtDateTime(m.sent_at || m.created_at)}{m.status_reason && m.status !== 'sent' ? ` · ${m.status_reason}` : ''}</p></div>
                    <StatusBadge status={m.status} />
                  </li>
                ))}
                {!data.recent.length && <li className="px-5 py-6 text-sm text-neutral-500">No emails yet. They’ll appear as enquiries and bookings come in.</li>}
              </ul>
            </section>
            <section className="card">
              <div className="card-header flex items-center justify-between"><h2 className="font-medium text-ink">Campaigns in this period</h2><Link href="/admin/email/analytics" className="text-sm text-[#0055cc]">Analytics</Link></div>
              <ul className="divide-y divide-neutral-100">
                {data.analytics.campaigns.slice(0, 8).map(c => (
                  <li key={c.id} className="px-5 py-3 text-sm flex items-center gap-3">
                    <Link href={`/admin/email/campaigns/${c.id}`} className="flex-1 min-w-0 truncate text-ink hover:underline">{c.name}</Link>
                    <span className="text-neutral-500 whitespace-nowrap">{c.sent} sent · {pct(c.clicked, c.sent)} clicked · {c.enquiries} enquiries</span>
                  </li>
                ))}
                {!data.analytics.campaigns.length && <li className="px-5 py-6 text-sm text-neutral-500">No campaigns sent in this period.</li>}
              </ul>
              {(data.queue.failed > 0 || data.queue.failedRuns > 0) && (
                <p className="px-5 py-3 text-sm border-t border-neutral-100 text-red-700">{data.queue.failed} failed emails and {data.queue.failedRuns} failed workflow runs need attention. <Link href="/admin/email/log?status=failed" className="underline">Review</Link></p>
              )}
            </section>
          </div>
        </>
      )}
    </EmailShell>
  )
}

export default function Page() {
  return <RequireRole min="admin"><OverviewPage /></RequireRole>
}
