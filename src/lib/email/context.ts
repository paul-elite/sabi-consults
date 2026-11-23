// Builds the data for an email at the moment it is sent, straight from the
// database, so prices, availability and inspection times are always current.
import { db, siteUrl, type EmailSettings } from './config'
import { confirmUrl, firstName, prefsUrl, unsubscribeUrl, type ContactRow, type Interests } from './contacts'
import { enquiryTypeLabel, LEAD_STATUSES, stageLabel } from './defaults'
import { propertyPrice, type PropertyLite, type RenderData } from './render'
import { formatNaira } from '@/lib/format'

export interface MessageContext {
  vars?: Record<string, string | number | boolean | null>
  property_id?: string | null
  property_ids?: string[]
  properties_mode?: 'similar' | 'match' | 'recent'
  since?: string                      // for digests: listings created after this time
  viewing_id?: string | null
  inquiry_id?: string | null
  lead_id?: string | null
  transaction_id?: string | null
  referral_id?: string | null
  campaign_id?: string | null
  agent_id?: string | null
  expected_datetime?: string | null   // reminders: skip if the inspection moved
  promotes_property?: boolean         // skip if the property is no longer available
  admin_path?: string
}

const TZ = 'Africa/Lagos'
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ })
const fmtDateShort = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ })
const naira = (n: number | null | undefined) => (n && n > 0 ? formatNaira(n) : '')

const PROPERTY_COLS = 'id, title, district, address, type, price, price_label, variations, bedrooms, bathrooms, bq, land_size, images, description, status, latitude, longitude, created_at'

export async function loadProperty(id: string): Promise<PropertyLite | null> {
  const { data } = await db().from('properties').select(PROPERTY_COLS).eq('id', id).maybeSingle()
  return (data as PropertyLite) || null
}

/** Available listings matching someone's stated interests. */
export async function matchingProperties(interests: Interests, opts: { exclude?: string[]; limit?: number; since?: string } = {}): Promise<PropertyLite[]> {
  let q = db().from('properties').select(PROPERTY_COLS).eq('status', 'available').order('created_at', { ascending: false }).limit(40)
  if (opts.since) q = q.gte('created_at', opts.since)
  const { data } = await q
  return ((data || []) as PropertyLite[])
    .filter(p => !opts.exclude?.includes(p.id) && propertyMatches(p, interests))
    .slice(0, opts.limit ?? 4)
}

export function propertyMatches(p: PropertyLite, i: Interests | Record<string, unknown> | null | undefined): boolean {
  if (!i) return true
  const it = i as Interests
  if (it.types?.length && !it.types.includes(p.type)) return false
  if (it.districts?.length && !it.districts.some(d => d.toLowerCase() === p.district.toLowerCase())) return false
  if (it.minBudget && p.price > 0 && p.price < it.minBudget) return false
  if (it.maxBudget && p.price > 0 && p.price > it.maxBudget) return false
  if (it.bedrooms && p.type === 'house' && (p.bedrooms || 0) < it.bedrooms) return false
  return true
}

async function similarTo(p: PropertyLite, limit = 3): Promise<PropertyLite[]> {
  const { data } = await db().from('properties').select(PROPERTY_COLS)
    .eq('status', 'available').eq('type', p.type).neq('id', p.id).order('created_at', { ascending: false }).limit(30)
  const rows = (data || []) as PropertyLite[]
  // Same district first, then nearest price
  return rows.sort((a, b) => {
    const d = Number(b.district === p.district) - Number(a.district === p.district)
    return d || Math.abs(a.price - p.price) - Math.abs(b.price - p.price)
  }).slice(0, limit)
}

async function agentById(id: string | null | undefined) {
  if (!id) return null
  const { data } = await db().from('admin_users').select('id, name, email, phone, active').eq('id', id).maybeSingle()
  return data && data.active !== false ? { id: data.id as string, name: data.name as string, email: data.email as string, phone: (data.phone as string) || null } : null
}

export interface Built { data: RenderData; skip?: string; agentEmail?: string | null }

export async function buildRenderData(
  ctx: MessageContext,
  contact: Pick<ContactRow, 'id' | 'email' | 'name' | 'interests'> | null,
  recipient: { email: string; name?: string | null },
  settings: EmailSettings,
  templateKey: string,
): Promise<Built> {
  const client = db()
  const site = siteUrl()
  const vars: RenderData['vars'] = {
    brand_name: settings.brandName,
    site_url: site,
    company_phone: settings.phone,
    company_email: settings.companyEmail,
    whatsapp_url: settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '',
    name: recipient.name || contact?.name || '',
    first_name: firstName(recipient.name || contact?.name),
    email: recipient.email,
    ...(contact ? { prefs_url: prefsUrl(contact.id), unsubscribe_url: unsubscribeUrl(contact.id), confirm_url: confirmUrl(contact.id) } : {}),
    ...(ctx.vars || {}),
  }
  const data: RenderData = { vars }
  let agentId = ctx.agent_id || null

  // --- inspection
  if (ctx.viewing_id) {
    const { data: v } = await client.from('viewing_requests').select('*').eq('id', ctx.viewing_id).maybeSingle()
    if (!v) return { data, skip: 'Inspection no longer exists' }
    if (ctx.expected_datetime) {
      if (v.status !== 'confirmed') return { data, skip: `Inspection is ${v.status}` }
      if (!v.confirmed_datetime || new Date(v.confirmed_datetime).getTime() !== new Date(ctx.expected_datetime).getTime()) return { data, skip: 'Inspection was rescheduled' }
    }
    ctx.property_id = ctx.property_id || v.property_id
    ctx.lead_id = ctx.lead_id || v.lead_id
    agentId = agentId || v.assigned_to
    const when = v.confirmed_datetime as string | null
    const prop = v.property_id ? await loadProperty(v.property_id) : null
    const location = prop ? [prop.address, prop.district, 'Abuja'].filter(Boolean).join(', ') : ''
    const maps = prop?.latitude && prop?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${prop.latitude},${prop.longitude}`
      : location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : ''
    Object.assign(vars, {
      reference: v.reference || '',
      inspection_date: when ? fmtDate(when) : v.preferred_date ? fmtDate(`${v.preferred_date}T12:00:00+01:00`) + ' (requested)' : 'To be confirmed',
      inspection_time: when ? fmtTime(when) : v.preferred_time ? `${v.preferred_time} (requested)` : 'To be confirmed',
      inspection_location: location,
      maps_url: maps,
      inspection_status: v.status,
    })
    data.inspection = {
      rows: [
        ['Property', prop?.title || ''],
        ['Date', String(vars.inspection_date)],
        ['Time', String(vars.inspection_time)],
        ['Location', location],
        ['Reference', v.reference || ''],
        ['Notes', v.visitor_notes || ''],
      ],
    }
  }

  // --- enquiry
  if (ctx.inquiry_id) {
    const { data: q } = await client.from('inquiries').select('*').eq('id', ctx.inquiry_id).maybeSingle()
    if (q) {
      ctx.property_id = ctx.property_id || q.property_id
      ctx.lead_id = ctx.lead_id || q.lead_id
      Object.assign(vars, {
        reference: vars.reference || q.reference || '',
        enquiry_type: q.enquiry_type, enquiry_type_label: enquiryTypeLabel(q.enquiry_type).toLowerCase(),
        message: q.message, budget: q.budget || '', location: q.preferred_location || '',
      })
      data.enquiry = {
        rows: [
          ['Reference', q.reference || ''],
          ['Enquiry', enquiryTypeLabel(q.enquiry_type)],
          ['Budget', q.budget || ''],
          ['Preferred location', q.preferred_location || ''],
          ['Your message', q.message || ''],
        ],
      }
    }
  }

  // --- transaction
  if (ctx.transaction_id) {
    const { data: t } = await client.from('transactions').select('*').eq('id', ctx.transaction_id).maybeSingle()
    if (!t) return { data, skip: 'Transaction no longer exists' }
    ctx.property_id = ctx.property_id || t.property_id
    ctx.lead_id = ctx.lead_id || t.lead_id
    agentId = agentId || t.assigned_to
    Object.assign(vars, {
      transaction_reference: t.reference, transaction_stage: t.stage, transaction_stage_label: stageLabel(t.stage),
      amount: vars.amount || naira(t.amount_received),
    })
    data.transaction = {
      rows: [
        ['Reference', t.reference],
        ['Stage', stageLabel(t.stage)],
        ['Offer', naira(t.offer_amount)],
        ['Agreed price', naira(t.agreed_price)],
        ['Amount received', naira(t.amount_received)],
      ],
    }
  }

  // --- property
  if (ctx.property_id) {
    const p = await loadProperty(ctx.property_id)
    if (p) {
      if (ctx.promotes_property && p.status !== 'available') return { data, skip: `Property is ${p.status}` }
      data.property = p
      Object.assign(vars, {
        property_id: p.id,
        property_title: p.title,
        property_url: `${site}/properties/${p.id}`,
        property_price: propertyPrice(p),
        property_location: p.district,
        property_type: p.type,
        property_status: p.status,
      })
      if (data.transaction) data.transaction.rows.splice(1, 0, ['Property', p.title])
    }
  }

  // --- property lists
  let list: PropertyLite[] = []
  if (ctx.property_ids?.length) {
    const { data: rows } = await client.from('properties').select(PROPERTY_COLS).in('id', ctx.property_ids).eq('status', 'available')
    const byId = new Map(((rows || []) as PropertyLite[]).map(r => [r.id, r]))
    list = ctx.property_ids.map(id => byId.get(id)).filter(Boolean) as PropertyLite[]
  } else if (ctx.properties_mode === 'similar' && data.property) {
    list = await similarTo(data.property)
  } else if (ctx.properties_mode === 'match' || ctx.properties_mode === 'recent') {
    const interests = (contact?.interests || {}) as Interests
    list = await matchingProperties(interests, { exclude: data.property ? [data.property.id] : [], since: ctx.since, limit: ctx.properties_mode === 'recent' ? 8 : 4 })
    if (!list.length && data.property && ctx.properties_mode === 'match') list = await similarTo(data.property)
  }
  if (list.length) data.properties = list
  vars.has_properties = list.length > 0
  if ((templateKey === 'weekly_digest' || templateKey === 'similar_properties') && !list.length) return { data, skip: 'No matching properties to send' }

  // --- lead (mostly for team notifications)
  if (ctx.lead_id) {
    const { data: l } = await client.from('leads').select('*, lead_preferences(*)').eq('id', ctx.lead_id).maybeSingle()
    if (l) {
      agentId = agentId || l.assigned_to
      const pref = Array.isArray(l.lead_preferences) ? l.lead_preferences[0] : l.lead_preferences
      const { data: v } = await client.from('viewing_requests').select('preferred_date, preferred_time').eq('lead_id', l.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      const budget = vars.budget || (pref && (pref.min_budget || pref.max_budget)
        ? [naira(pref.min_budget), naira(pref.max_budget)].filter(Boolean).join(' – ') : '')
      const agent = await agentById(l.assigned_to)
      Object.assign(vars, {
        lead_name: l.name, lead_email: l.email || '', lead_phone: l.phone || '', lead_source: l.source || '',
        lead_status: l.status,
      })
      if (!vars.admin_url) vars.admin_url = `${site}${ctx.admin_path || `/admin/leads/${l.id}`}`
      data.lead = {
        rows: [
          ['Name', l.name],
          ['Email', l.email || ''],
          ['Phone', l.phone || ''],
          ['Enquiry type', String(vars.enquiry_type_label || '')],
          ['Property', String(vars.property_title || '')],
          ['Budget', String(budget || '')],
          ['Preferred location', String(vars.location || (pref?.preferred_districts || []).join(', ') || '')],
          ['Preferred inspection', v?.preferred_date ? `${v.preferred_date}${v.preferred_time ? `, ${v.preferred_time}` : ''}` : ''],
          ['Source', [l.source, l.utm_campaign].filter(Boolean).join(' / ')],
          ['Status', LEAD_STATUSES.find(s => s.value === l.status)?.label || l.status],
          ['Assigned to', agent?.name || 'Unassigned'],
          ['Score', `${l.score ?? 0} (${l.quality || 'cold'})`],
          ['Received', fmtDateShort(l.created_at)],
        ],
      }
    }
  }
  if (!vars.admin_url) vars.admin_url = `${site}${ctx.admin_path || '/admin/leads'}`

  // --- referral
  if (ctx.referral_id) {
    const { data: r } = await client.from('referrals').select('*').eq('id', ctx.referral_id).maybeSingle()
    if (r) Object.assign(vars, { referral_name: r.referred_name, referral_status: r.status })
  }

  // --- agent card
  const agent = await agentById(agentId)
  if (agent) {
    data.agent = { name: agent.name, phone: agent.phone, email: agent.email }
    Object.assign(vars, { agent_name: agent.name, agent_phone: agent.phone || '', agent_email: agent.email })
  } else if (data.inspection || data.transaction) {
    // No named consultant yet: show the company line instead of a blank card
    data.agent = { name: `${settings.brandName} team`, phone: settings.phone || null, email: settings.companyEmail || null }
  }

  return { data, agentEmail: agent?.email || null }
}

export async function agentFor(ctx: MessageContext): Promise<{ id: string; name: string; email: string } | null> {
  const client = db()
  let id = ctx.agent_id || null
  if (!id && ctx.viewing_id) id = (await client.from('viewing_requests').select('assigned_to').eq('id', ctx.viewing_id).maybeSingle()).data?.assigned_to
  if (!id && ctx.transaction_id) id = (await client.from('transactions').select('assigned_to').eq('id', ctx.transaction_id).maybeSingle()).data?.assigned_to
  if (!id && ctx.lead_id) id = (await client.from('leads').select('assigned_to').eq('id', ctx.lead_id).maybeSingle()).data?.assigned_to
  const a = await agentById(id)
  return a ? { id: a.id, name: a.name, email: a.email } : null
}
