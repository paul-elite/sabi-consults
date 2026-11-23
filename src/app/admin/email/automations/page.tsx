'use client'

import Link from 'next/link'
import { RequireRole } from '@/components/admin/AdminNav'
import { EmailShell, Empty, StatusBadge, send, useApi, useToast } from '@/components/admin/email/ui'

interface A { id: string; key: string | null; name: string; description: string | null; trigger: string; active: boolean; is_system: boolean; steps: { type: string }[]; stats: Record<string, number> }

function AutomationsPage() {
  const { data, loading, error, reload } = useApi<{ automations: A[]; meta: { triggers: Record<string, string> } }>('/api/email/automations')
  const { show, node } = useToast()
  const toggle = async (a: A) => {
    if (a.active && (a.stats.active || 0) > 0 && !confirm(`Turn off “${a.name}”? ${a.stats.active} people part-way through will stop receiving its emails.`)) return
    try { await send(`/api/email/automations/${a.id}`, 'PUT', { active: !a.active }); show('ok', a.active ? 'Turned off' : 'Turned on'); reload() } catch (e) { show('error', (e as Error).message) }
  }
  return (
    <EmailShell title="Automations" description="Workflows that run on their own when something happens: an enquiry, a booking, a sale. Each one checks consent before every email and stops when it’s no longer relevant."
      actions={<Link href="/admin/email/automations/new" className="btn btn-md btn-primary">New workflow</Link>}>
      {node}
      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-sm text-neutral-400 animate-pulse">Loading…</p> : error ? <p className="p-6 text-sm text-red-600">{error}</p> : data?.automations.length ? (
          <ul className="divide-y divide-neutral-100">
            {data.automations.map(a => (
              <li key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[260px]">
                  <Link href={`/admin/email/automations/${a.id}`} className="font-medium text-ink hover:underline">{a.name}</Link>
                  <p className="text-xs text-neutral-500 mt-0.5">When: {data.meta.triggers[a.trigger] || a.trigger} · {a.steps.length} steps{a.is_system ? ' · built-in' : ''}</p>
                  {a.description && <p className="text-sm text-neutral-600 mt-1 max-w-2xl">{a.description}</p>}
                </div>
                <div className="text-xs text-neutral-500 w-56">
                  {a.stats.active || 0} in progress · {a.stats.completed || 0} completed · {a.stats.exited || 0} stopped early
                  {(a.stats.failed || 0) > 0 && <span className="block text-red-600">{a.stats.failed} failed</span>}
                </div>
                <StatusBadge status={a.active ? 'active' : 'paused'} label={a.active ? 'On' : 'Off'} />
                <button role="switch" aria-checked={a.active} aria-label={`${a.active ? 'Turn off' : 'Turn on'} ${a.name}`} onClick={() => toggle(a)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${a.active ? 'bg-[#0055cc]' : 'bg-neutral-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${a.active ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </li>
            ))}
          </ul>
        ) : <Empty title="No workflows" />}
      </div>
      <p className="text-xs text-neutral-500 mt-4">Figures cover the last 90 days. Inspection reminders are timed from each booking and aren’t listed as a workflow; change their timing in Email settings.</p>
    </EmailShell>
  )
}

export default function Page() {
  return <RequireRole min="admin"><AutomationsPage /></RequireRole>
}
