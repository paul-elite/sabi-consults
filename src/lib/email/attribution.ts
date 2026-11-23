// Attribution. "Direct" means the person arrived through a tracked email link
// (a signed cookie set on click) shortly before converting. "Assisted" means
// they clicked one of our emails in the weeks before, but came back another
// way. Simply having received an email is never counted.
import { cookies } from 'next/headers'
import { hmacTag, verifyTag } from '@/lib/auth'
import { db } from './config'

export const CLICK_COOKIE = 'sabi_em'
const DIRECT_DAYS = 7
const ASSIST_DAYS: Record<string, number> = { lead: 30, enquiry: 30, inspection: 30, transaction: 90 }

export const clickCookieValue = (messageId: string) => `${messageId}.${hmacTag('emclick', messageId, 16)}`

async function clickedMessageFromCookie(): Promise<string | null> {
  try {
    const raw = (await cookies()).get(CLICK_COOKIE)?.value
    if (!raw) return null
    const [id, tag] = raw.split('.')
    return id && tag && verifyTag('emclick', id, tag, 16) ? id : null
  } catch { return null }
}

export interface ConversionInput {
  type: 'lead' | 'enquiry' | 'inspection' | 'transaction'
  entityId: string
  contactId?: string | null
  leadId?: string | null
  propertyId?: string | null
  value?: number | null
  /** Pass false where there's no browser request (e.g. admin completing a sale) */
  useCookie?: boolean
}

export async function recordConversion(input: ConversionInput): Promise<void> {
  try {
    const client = db()
    const cols = 'id, contact_id, lead_id, campaign_id, automation_id, template_key, clicked_at'
    let direct: Record<string, any> | null = null
    if (input.useCookie !== false) {
      const id = await clickedMessageFromCookie()
      if (id) {
        const { data } = await client.from('email_messages').select(cols).eq('id', id).maybeSingle()
        if (data?.clicked_at && Date.now() - Date.parse(data.clicked_at) < DIRECT_DAYS * 86400_000) direct = data
      }
    }
    const base = {
      conversion_type: input.type, entity_id: input.entityId, contact_id: input.contactId || null,
      lead_id: input.leadId || null, property_id: input.propertyId || null, value: input.value || null,
    }
    if (direct) {
      await client.from('email_attributions').upsert({
        ...base, model: 'direct', message_id: direct.id, campaign_id: direct.campaign_id,
        automation_id: direct.automation_id, template_key: direct.template_key,
      }, { onConflict: 'conversion_type,entity_id,model', ignoreDuplicates: true })
      return
    }
    // Assisted: the most recent click by this person within the window
    const since = new Date(Date.now() - (ASSIST_DAYS[input.type] || 30) * 86400_000).toISOString()
    const filters: string[] = []
    if (input.contactId) filters.push(`contact_id.eq.${input.contactId}`)
    if (input.leadId) filters.push(`lead_id.eq.${input.leadId}`)
    if (!filters.length) return
    const { data: click } = await client.from('email_messages').select(cols)
      .or(filters.join(',')).gte('clicked_at', since).order('clicked_at', { ascending: false }).limit(1).maybeSingle()
    if (!click) return
    await client.from('email_attributions').upsert({
      ...base, model: 'assisted', message_id: click.id, campaign_id: click.campaign_id,
      automation_id: click.automation_id, template_key: click.template_key,
    }, { onConflict: 'conversion_type,entity_id,model', ignoreDuplicates: true })
  } catch (err) {
    console.error('recordConversion', err)
  }
}
