// The outgoing queue. Everything that sends email puts a row in email_messages
// with a unique idempotency key, and the worker delivers due rows in batches.
// A repeated webhook, a retried job or a restarted server can't send twice:
// the key is unique in the database and is passed to Resend as well.
import { hmacTag, verifyTag } from '@/lib/auth'
import { db, getEmailSettings, siteUrl } from './config'
import { unsubscribeApiUrl, type ContactRow } from './contacts'
import { buildRenderData, type MessageContext } from './context'
import type { Audience } from './defaults'
import { sendViaResend, providerConfigured } from './provider'
import { renderEmail } from './render'
import { getTemplate } from './store'

export interface QueueInput {
  to: string
  toName?: string | null
  contactId?: string | null
  templateKey: string
  category?: Audience
  context?: MessageContext
  idempotencyKey: string
  sendAfter?: Date
  expiresAt?: Date
  campaignId?: string | null
  automationId?: string | null
  runId?: string | null
  leadId?: string | null
  propertyId?: string | null
  viewingId?: string | null
  inquiryId?: string | null
  transactionId?: string | null
  createdBy?: string | null
}

const EXPIRY_HOURS: Record<Audience, number> = { transactional: 48, internal: 24, service: 72, marketing: 24 * 7 }

/** Queues one email. Returns the existing row if this key was already queued. */
export async function queueEmail(input: QueueInput): Promise<{ id: string; status: string; duplicate: boolean }> {
  const client = db()
  const tpl = await getTemplate(input.templateKey)
  if (!tpl) throw new Error(`Unknown template: ${input.templateKey}`)
  const category = input.category || tpl.audience
  const sendAfter = input.sendAfter || new Date()
  const expiresAt = input.expiresAt || new Date(sendAfter.getTime() + EXPIRY_HOURS[category] * 3600_000)

  // Consent is checked again at send time; checking now too keeps history honest
  let status = 'queued'
  let reason: string | null = null
  if (input.contactId && category !== 'internal') {
    const { data: c } = await client.from('contacts').select('marketing_status, followups_opt_out, suppressed, archived_at').eq('id', input.contactId).maybeSingle()
    const blocked = c ? blockReason(c as ContactRow, category) : null
    if (blocked) { status = 'skipped'; reason = blocked }
  }

  const row = {
    idempotency_key: input.idempotencyKey.slice(0, 300),
    contact_id: input.contactId || null,
    to_email: input.to.trim().toLowerCase(),
    to_name: input.toName || null,
    category,
    template_key: input.templateKey,
    context: input.context || {},
    status,
    status_reason: reason,
    send_after: sendAfter.toISOString(),
    expires_at: expiresAt.toISOString(),
    campaign_id: input.campaignId || null,
    automation_id: input.automationId || null,
    run_id: input.runId || null,
    lead_id: input.leadId || input.context?.lead_id || null,
    property_id: input.propertyId || input.context?.property_id || null,
    viewing_id: input.viewingId || input.context?.viewing_id || null,
    inquiry_id: input.inquiryId || input.context?.inquiry_id || null,
    transaction_id: input.transactionId || input.context?.transaction_id || null,
    created_by: input.createdBy || null,
  }
  const { data, error } = await client.from('email_messages').insert(row).select('id, status').single()
  if (!error && data) return { id: data.id, status: data.status, duplicate: false }
  // 23505 = unique violation on the idempotency key: it was queued before
  const { data: existing } = await client.from('email_messages').select('id, status').eq('idempotency_key', row.idempotency_key).maybeSingle()
  if (existing) return { id: existing.id, status: existing.status, duplicate: true }
  throw new Error(error?.message || 'Could not queue email')
}

/** Why a contact can't receive this kind of email right now (null = allowed). */
export function blockReason(c: Pick<ContactRow, 'marketing_status' | 'followups_opt_out' | 'suppressed' | 'archived_at'>, category: Audience): string | null {
  if (c.suppressed) return 'Address is suppressed (bounce or spam complaint)'
  if (category === 'marketing') {
    if (c.archived_at) return 'Contact is archived'
    if (c.marketing_status !== 'subscribed') return 'No marketing consent'
  }
  if (category === 'service') {
    if (c.followups_opt_out) return 'Opted out of follow-up emails'
    if (c.marketing_status === 'unsubscribed') return 'Unsubscribed'
  }
  return null
}

/* ----------------------------------------------------------------- tracking */

const TAG_LEN = 16
export const clickTag = (messageId: string, url: string) => hmacTag('click', `${messageId}|${url}`, TAG_LEN)
export const verifyClick = (messageId: string, url: string, tag: string) => verifyTag('click', `${messageId}|${url}`, tag, TAG_LEN)

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

function withUtm(url: string, campaign: string, content: string): string {
  try {
    const u = new URL(url)
    const site = new URL(siteUrl())
    if (u.host !== site.host) return url
    if (!u.searchParams.has('utm_source')) {
      u.searchParams.set('utm_source', 'email')
      u.searchParams.set('utm_medium', 'email')
      u.searchParams.set('utm_campaign', campaign)
      u.searchParams.set('utm_content', content)
    }
    return u.toString()
  } catch { return url }
}

export function addTracking(html: string, messageId: string, campaign: string, templateKey: string, trackOpens: boolean): string {
  const site = siteUrl()
  let out = html.replace(/<a ([^>]*?)href="([^"]+)"([^>]*)>/g, (full, pre: string, href: string, post: string) => {
    // Unsubscribe and preference links aren't counted as engagement
    if (/data-notrack/.test(pre + post)) return full.replace(/\s*data-notrack="1"/, '')
    const raw = href.replace(/&amp;/g, '&')
    if (!/^https?:/i.test(raw)) return full
    const target = withUtm(raw, campaign, templateKey)
    const tracked = `${site}/api/email/c/${messageId}?u=${encodeURIComponent(Buffer.from(target).toString('base64url'))}&s=${clickTag(messageId, target)}`
    return `<a ${pre}href="${tracked.replace(/&/g, '&amp;')}"${post}>`
  })
  if (trackOpens) out = out.replace('</body>', `<img src="${site}/api/email/o/${messageId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0"></body>`)
  return out
}

/* ----------------------------------------------------------------- delivery */

export interface DeliverStats { claimed: number; sent: number; skipped: number; failed: number; retried: number; held: number }

/** Sends queued emails that are due, until the batch or time budget runs out. */
export async function deliverDue(opts: { deadline: number; limit?: number }): Promise<DeliverStats> {
  const stats: DeliverStats = { claimed: 0, sent: 0, skipped: 0, failed: 0, retried: 0, held: 0 }
  const client = db()
  const settings = await getEmailSettings()
  const limit = opts.limit ?? settings.batchSize

  // Daily cap on non-essential email; transactional and team mail always go
  const since = new Date(); since.setHours(0, 0, 0, 0)
  const { count: sentToday } = await client.from('email_messages').select('id', { count: 'exact', head: true })
    .in('category', ['marketing', 'service']).gte('sent_at', since.toISOString())
  let bulkRemaining = Math.max(0, settings.dailyLimit - (sentToday || 0))

  const { data: claimed, error } = await client.rpc('claim_email_messages', { p_limit: limit })
  if (error) throw new Error(`claim_email_messages: ${error.message}`)
  const rows = (claimed || []) as Record<string, any>[]
  stats.claimed = rows.length
  const configured = providerConfigured() && !!settings.senderAddress

  for (const m of rows) {
    if (Date.now() > opts.deadline) {
      // Out of time: release untouched rows for the next run
      await client.from('email_messages').update({ status: 'queued', locked_at: null, attempts: Math.max(0, m.attempts - 1) }).eq('id', m.id).eq('status', 'sending')
      continue
    }
    const finish = async (patch: Record<string, unknown>) => { await client.from('email_messages').update({ locked_at: null, ...patch }).eq('id', m.id) }
    try {
      if (m.expires_at && new Date(m.expires_at) < new Date()) {
        await finish({ status: 'skipped', status_reason: configured ? 'Expired before it could be sent' : 'Expired while the email provider was not configured' })
        stats.skipped++; continue
      }

      let contact: ContactRow | null = null
      if (m.contact_id) {
        const { data } = await client.from('contacts').select('*').eq('id', m.contact_id).maybeSingle()
        contact = data as ContactRow | null
        const blocked = contact ? blockReason(contact, m.category) : null
        if (blocked) { await finish({ status: 'skipped', status_reason: blocked }); stats.skipped++; continue }
      }

      if ((m.category === 'marketing' || m.category === 'service') && bulkRemaining <= 0) {
        await finish({ status: 'queued', send_after: new Date(Date.now() + 60 * 60_000).toISOString(), status_reason: 'Daily sending limit reached; will retry', attempts: Math.max(0, m.attempts - 1) })
        stats.held++; continue
      }

      if (!configured) {
        await finish({
          status: 'queued', send_after: new Date(Date.now() + 15 * 60_000).toISOString(), attempts: Math.max(0, m.attempts - 1),
          status_reason: providerConfigured() ? 'Waiting: no sender address set in Email settings' : 'Waiting: email provider not configured (RESEND_API_KEY)',
        })
        stats.held++; continue
      }

      // Campaign state is checked at send time so pause and cancel take effect immediately
      let tpl = await getTemplate(m.template_key)
      let campaignLabel = m.template_key as string
      const ctx = (m.context || {}) as MessageContext
      const campaignId = m.campaign_id || (ctx as { campaign_test?: string }).campaign_test
      if (campaignId) {
        const isTest = !m.campaign_id
        const { data: camp } = await client.from('campaigns').select('*').eq('id', campaignId).maybeSingle()
        if (!camp || (!isTest && camp.status === 'cancelled')) { await finish({ status: 'cancelled', status_reason: 'Campaign cancelled' }); stats.skipped++; continue }
        if (!isTest && camp.status === 'paused') {
          await finish({ status: 'queued', send_after: new Date(Date.now() + 10 * 60_000).toISOString(), status_reason: 'Campaign paused', attempts: Math.max(0, m.attempts - 1) })
          stats.held++; continue
        }
        campaignLabel = slug(camp.name) || 'campaign'
        if (tpl) {
          // The campaign's own text is admin content, so it keeps its formatting
          tpl = { ...tpl, subject: (isTest ? '[Test] ' : '') + (camp.subject || tpl.subject), preheader: camp.preheader || tpl.preheader, body: tpl.body.replace('{{campaign_body}}', camp.body || '') }
          ctx.vars = { ...(ctx.vars || {}), campaign_subject: camp.subject }
          if (camp.property_ids?.length && !ctx.property_ids?.length) ctx.property_ids = camp.property_ids
        }
      } else if (m.automation_id) {
        const { data: au } = await client.from('automations').select('key, name').eq('id', m.automation_id).maybeSingle()
        if (au) campaignLabel = slug(au.key || au.name)
      }
      if (!tpl) { await finish({ status: 'failed', status_reason: `Template ${m.template_key} not found` }); stats.failed++; continue }

      const built = await buildRenderData(ctx, contact, { email: m.to_email, name: m.to_name }, settings, m.template_key)
      if (built.skip) { await finish({ status: 'skipped', status_reason: built.skip }); stats.skipped++; continue }

      const withLinks = contact && (m.category === 'marketing' || m.category === 'service')
      const rendered = renderEmail(tpl, built.data, {
        brandName: settings.brandName, brandColor: settings.brandColor, logoUrl: settings.logoUrl,
        address: settings.address, phone: settings.phone, whatsapp: settings.whatsapp, siteUrl: siteUrl(),
        audience: m.category,
        prefsUrl: withLinks ? String(built.data.vars.prefs_url || '') : undefined,
        unsubscribeUrl: withLinks ? String(built.data.vars.unsubscribe_url || '') : undefined,
      })
      const html = m.category === 'internal' ? rendered.html : addTracking(rendered.html, m.id, campaignLabel, m.template_key, settings.trackOpens)
      const headers: Record<string, string> = { 'X-Entity-Ref-ID': m.id }
      if (withLinks && contact) {
        headers['List-Unsubscribe'] = `<${unsubscribeApiUrl(contact.id)}>`
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
      }

      const result = await sendViaResend({
        from: `${settings.senderName.replace(/[<>"]/g, '')} <${settings.senderAddress}>`,
        to: m.to_email,
        replyTo: settings.replyTo || undefined,
        subject: rendered.subject,
        html, text: rendered.text, headers,
        tags: [{ name: 'category', value: m.category }, { name: 'template', value: m.template_key.replace(/[^a-zA-Z0-9_-]/g, '_') }],
        idempotencyKey: m.id,
      })
      if (result.ok) {
        await finish({ status: 'sent', provider: 'resend', provider_id: result.id, sent_at: new Date().toISOString(), subject: rendered.subject, html, status_reason: null })
        if (contact) await client.from('contacts').update({ last_emailed_at: new Date().toISOString() }).eq('id', contact.id)
        if (m.category === 'marketing' || m.category === 'service') bulkRemaining--
        stats.sent++
      } else if (result.retryable && m.attempts < 6) {
        const backoff = Math.min(6 * 60, 2 ** m.attempts) * 60_000
        await finish({ status: 'queued', send_after: new Date(Date.now() + backoff).toISOString(), status_reason: `Retrying: ${result.error}`, subject: rendered.subject })
        stats.retried++
      } else {
        await finish({ status: 'failed', status_reason: result.error, subject: rendered.subject })
        await client.from('email_events').insert({ message_id: m.id, contact_id: m.contact_id, type: 'failed', payload: { error: result.error } })
        stats.failed++
      }
      // Stay under Resend's default 2 requests per second
      await new Promise(r => setTimeout(r, 520))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await finish(m.attempts < 6
        ? { status: 'queued', send_after: new Date(Date.now() + 5 * 60_000).toISOString(), status_reason: `Retrying after error: ${msg}` }
        : { status: 'failed', status_reason: msg })
      stats.failed++
    }
  }
  return stats
}

/** Renders a template with sample or real data for previews and test sends (never queued). */
export async function previewTemplate(
  tpl: { subject: string; preheader?: string | null; body: string; audience: Audience },
  ctx: MessageContext,
  contact: ContactRow | null,
) {
  const settings = await getEmailSettings()
  const built = await buildRenderData(ctx, contact, { email: contact?.email || 'preview@example.com', name: contact?.name || 'Ada Okafor' }, settings, 'preview')
  const vars = built.data.vars
  // Sample values so placeholders in a preview read naturally
  const sample: Record<string, string> = {
    reference: 'SC-PREVIEW', enquiry_type: 'general', enquiry_type_label: 'general enquiry', when: 'tomorrow', years: '1 year',
    old_price: '₦85,000,000', new_price: '₦80,000,000', amount: '₦10,000,000', guide_title: 'Abuja Property Buying Guide',
    guide_url: `${siteUrl()}/guides`, alert_summary: 'Houses in Gwarinpa up to ₦120,000,000', referral_name: 'Chidi Eze',
    inspection_event: 'booked', hours: '2', note: '', campaign_subject: tpl.subject, lead_name: 'Ada Okafor',
    transaction_reference: 'TX-PREVIEW', transaction_stage: 'offer_accepted', transaction_stage_label: 'Offer accepted',
    prefs_url: `${siteUrl()}/email/preferences`, unsubscribe_url: `${siteUrl()}/email/unsubscribe`, confirm_url: `${siteUrl()}/email/confirm`,
  }
  for (const [k, v] of Object.entries(sample)) if (vars[k] === undefined || vars[k] === '') vars[k] = v
  return renderEmail(tpl, built.data, {
    brandName: settings.brandName, brandColor: settings.brandColor, logoUrl: settings.logoUrl, address: settings.address,
    phone: settings.phone, whatsapp: settings.whatsapp, siteUrl: siteUrl(), audience: tpl.audience,
    prefsUrl: String(vars.prefs_url), unsubscribeUrl: String(vars.unsubscribe_url),
  })
}
