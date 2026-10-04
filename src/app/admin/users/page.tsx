'use client'

import { useEffect, useState } from 'react'
import { RequireRole, roleLabel, useAdminUser, type AdminRole } from '@/components/admin/AdminNav'

interface Account { id: string; email: string; name: string; role: AdminRole; active: boolean; last_login_at: string | null; created_at: string }

const ROLE_HELP: Record<AdminRole, string> = {
  super_admin: 'Everything, including branding and staff accounts',
  admin: 'Listings, inquiries, blog, team and contact settings',
  staff: 'Listings, inquiries, blog and team',
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const arr = new Uint32Array(14)
  crypto.getRandomValues(arr)
  return Array.from(arr, n => chars[n % chars.length]).join('')
}

function UsersManager() {
  const me = useAdminUser()
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' as AdminRole, password: generatePassword() })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // The sign-up link carries a private invite token; without STAFF_REGISTRATION_TOKEN self sign-up is closed
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/users/invite', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => setInviteToken(d?.token ?? null)).catch(() => {})
  }, [])
  const joinLink = inviteToken && typeof window !== 'undefined' ? `${window.location.origin}/admin/join?invite=${encodeURIComponent(inviteToken)}` : ''

  const copyJoinLink = () => {
    navigator.clipboard?.writeText(joinLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const load = () =>
    fetch('/api/users', { cache: 'no-store' }).then(async r => {
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setAccounts(d)
    }).catch(e => setLoadError(e.message || "Couldn't load accounts"))
  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setFields({}); setNotice(null)
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await res.json()
    setBusy(false)
    if (!res.ok) { setFields(d.fields || {}); setNotice({ type: 'error', text: d.error }); return }
    setAccounts(a => [...(a || []), d])
    setCreated({ email: form.email, password: form.password })
    setForm({ name: '', email: '', role: 'staff', password: generatePassword() })
    setShowForm(false)
  }

  const update = async (a: Account, patch: Partial<Account> & { password?: string }, ok: string) => {
    setNotice(null)
    const res = await fetch(`/api/users/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const d = await res.json()
    if (!res.ok) { setNotice({ type: 'error', text: d.error }); return false }
    setAccounts(list => (list || []).map(x => (x.id === a.id ? d : x)))
    setNotice({ type: 'success', text: ok })
    return true
  }

  const resetPassword = async (a: Account) => {
    const password = generatePassword()
    if (!confirm(`Set a new password for ${a.name}? Their current password will stop working.`)) return
    if (await update(a, { password }, 'Password reset')) setCreated({ email: a.email, password })
  }

  const remove = async (a: Account) => {
    if (!confirm(`Delete ${a.name}'s account? They won't be able to sign in. This can't be undone; deactivating is reversible.`)) return
    const res = await fetch(`/api/users/${a.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { setNotice({ type: 'error', text: d.error }); return }
    setAccounts(list => (list || []).filter(x => x.id !== a.id))
    setNotice({ type: 'success', text: 'Account deleted' })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-light text-ink">Staff accounts</h1>
          <p className="text-sm text-neutral-500 mt-1">Give each person their own sign-in and the right level of access.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setCreated(null) }}
            className="btn btn-md btn-brand"
          >
            Add account
          </button>
        )}
      </div>

      {/* Self-registration link */}
      <div className="mb-6 p-4 card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink mb-1">Staff registration link</p>
            <p className="text-xs text-neutral-500">
              {joinLink
                ? 'Share this private link only with new staff. Their accounts stay inactive until you turn them on below.'
                : 'Self sign-up is off. Set STAFF_REGISTRATION_TOKEN (16+ characters) on the server to turn it on.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={joinLink}
              className="form-input flex-1 sm:w-64 h-10 text-sm text-neutral-600 bg-neutral-50"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={copyJoinLink}
              disabled={!joinLink}
              className={`btn btn-md ${linkCopied ? 'bg-emerald-100 text-emerald-700' : 'btn-secondary'}`}
            >
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className={`alert mb-4 ${notice.type === 'success' ? 'alert-success' : 'alert-error'}`} role="status">
          {notice.text}
        </div>
      )}

      {created && (
        <div className="mb-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm">
          <p className="font-medium text-emerald-900 mb-2">Share these sign-in details privately. The password won't be shown again.</p>
          <p className="font-mono break-all">Email: {created.email}<br />Password: {created.password}</p>
          <div className="mt-3 flex gap-2">
            <button
              className="btn btn-md btn-outline"
              onClick={() => navigator.clipboard?.writeText(`Sign in at ${location.origin}/admin\nEmail: ${created.email}\nPassword: ${created.password}`)}
            >
              Copy details
            </button>
            <button className="btn btn-md btn-ghost" onClick={() => setCreated(null)}>Done</button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className="mb-6 card card-body space-y-4" noValidate>
          <h2 className="font-semibold text-ink">New account</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label htmlFor="u-name" className="form-label">Full name</label>
              <input
                id="u-name"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`form-input ${fields.name ? 'form-input-error' : ''}`}
              />
              {fields.name && <p className="form-error">{fields.name}</p>}
            </div>
            <div className="form-field">
              <label htmlFor="u-email" className="form-label">Email</label>
              <input
                id="u-email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`form-input ${fields.email ? 'form-input-error' : ''}`}
              />
              {fields.email && <p className="form-error">{fields.email}</p>}
            </div>
          </div>
          <fieldset>
            <legend className="form-label mb-2">Role</legend>
            <div className="grid sm:grid-cols-3 gap-2">
              {(['staff', 'admin', 'super_admin'] as AdminRole[]).map(r => (
                <label
                  key={r}
                  className={`p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                    form.role === r
                      ? 'border-ink ring-1 ring-ink bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => setForm({ ...form, role: r })} className="sr-only" />
                  <span className="font-medium block">{roleLabel(r)}</span>
                  <span className="text-neutral-500 text-xs">{ROLE_HELP[r]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-field">
            <label htmlFor="u-password" className="form-label">Temporary password</label>
            <input
              id="u-password"
              type="text"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className={`form-input ${fields.password ? 'form-input-error' : ''}`}
            />
            {fields.password && <p className="form-error">{fields.password}</p>}
            <button type="button" className="text-sm text-brand mt-1.5 hover:underline" onClick={() => setForm({ ...form, password: generatePassword() })}>
              Generate another
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button disabled={busy} className="btn btn-md btn-brand">
              {busy ? (
                <>
                  <span className="spinner" />
                  Creating...
                </>
              ) : 'Create account'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-md btn-outline">Cancel</button>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="alert alert-error">{loadError}</div>
      ) : !accounts ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-16 skeleton rounded-lg" />)}</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 text-sm bg-neutral-50 border-b border-neutral-100">
            <span className="font-medium text-ink">Owner sign-in</span>
            <span className="text-neutral-500"> (from the ADMIN_EMAIL environment variable) is always a super admin and can't be removed here.</span>
          </div>
          {accounts.length === 0 && (
            <div className="p-8 text-center text-sm text-neutral-500">No staff accounts yet. Add one so people stop sharing the owner sign-in.</div>
          )}
          <div className="divide-y divide-neutral-100">
            {accounts.map(a => (
              <div key={a.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${a.active ? '' : 'opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{a.name}{a.id === me?.id && <span className="text-neutral-400 font-normal"> (you)</span>}</p>
                  <p className="text-sm text-neutral-500 truncate">{a.email}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {a.active ? (a.last_login_at ? `Last signed in ${new Date(a.last_login_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : "Hasn't signed in yet") : 'Deactivated'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={a.role}
                    disabled={a.id === me?.id}
                    aria-label={`Role for ${a.name}`}
                    onChange={e => update(a, { role: e.target.value as AdminRole }, `${a.name} is now ${roleLabel(e.target.value as AdminRole).toLowerCase()}`)}
                    className="form-input form-select h-10 px-3 text-sm w-auto"
                  >
                    {(['staff', 'admin', 'super_admin'] as AdminRole[]).map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                  <button onClick={() => resetPassword(a)} className="btn btn-sm btn-outline">Reset password</button>
                  {a.id !== me?.id && (
                    <>
                      <button
                        onClick={() => update(a, { active: !a.active }, a.active ? 'Account deactivated' : 'Account reactivated')}
                        className="btn btn-sm btn-outline"
                      >
                        {a.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button onClick={() => remove(a)} className="btn btn-sm btn-danger-ghost">Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  return <RequireRole min="super_admin"><UsersManager /></RequireRole>
}
