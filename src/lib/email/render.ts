// Turns a template (subject + lightweight markup body) and real data into a
// responsive, accessible HTML email and a plain-text version.
// Tables and inline styles are used on purpose: they are what Gmail, Outlook
// and Apple Mail all render consistently.
import { formatNaira } from '@/lib/format'

export interface PropertyLite {
  id: string
  title: string
  district: string
  address?: string | null
  type: 'land' | 'house' | string
  price: number
  price_label?: string | null
  variations?: unknown
  bedrooms?: number | null
  bathrooms?: number | null
  bq?: number | null
  land_size?: number | null
  images?: string[] | null
  description?: string | null
  status: string
  latitude?: number | null
  longitude?: number | null
}

export interface RenderData {
  vars: Record<string, string | number | boolean | null | undefined>
  property?: PropertyLite | null
  properties?: PropertyLite[]
  agent?: { name: string; phone?: string | null; email?: string | null } | null
  inspection?: { rows: [string, string][] } | null
  enquiry?: { rows: [string, string][] } | null
  lead?: { rows: [string, string][] } | null
  transaction?: { rows: [string, string][] } | null
}

export interface LayoutOptions {
  brandName: string
  brandColor: string
  logoUrl?: string
  address?: string
  phone?: string
  whatsapp?: string
  siteUrl: string
  audience: 'transactional' | 'service' | 'marketing' | 'internal'
  prefsUrl?: string
  unsubscribeUrl?: string
}

export interface Rendered { subject: string; preheader: string; html: string; text: string }

/* ------------------------------------------------------------------ helpers */

export const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Variable values must never be read as formatting or links
const escMd = (s: string) => s.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;').replace(/\*/g, '&#42;')

const safeHref = (url: string) => {
  const u = url.trim().replace(/&amp;/g, '&')
  return /^(https?:|mailto:|tel:)/i.test(u) ? u : ''
}

export function stripHtml(s: string): string {
  return s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

const truthy = (v: unknown) => v !== undefined && v !== null && v !== '' && v !== false && v !== 'false' && v !== 0

/** Resolves [[if a]], [[if a=b]], [[if a!=b]], [[else]], [[endif]] (nestable, inline or on their own lines). */
export function applyConditions(src: string, vars: RenderData['vars']): string {
  const re = /\[\[(if\s+[^\]]+|else|endif)\]\]/g
  let out = ''
  let last = 0
  const stack: { active: boolean; parentActive: boolean; matched: boolean }[] = []
  const active = () => stack.every(s => s.active)
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (active()) out += src.slice(last, m.index)
    last = m.index + m[0].length
    const tag = m[1].trim()
    if (tag.startsWith('if')) {
      const expr = tag.slice(2).trim()
      let ok: boolean
      const neq = expr.match(/^([\w.]+)\s*!=\s*(.*)$/)
      const eq = expr.match(/^([\w.]+)\s*=\s*(.*)$/)
      if (neq) ok = String(vars[neq[1]] ?? '') !== neq[2].trim()
      else if (eq) ok = eq[2].split(',').map(v => v.trim()).includes(String(vars[eq[1]] ?? ''))
      else ok = truthy(vars[expr])
      const parentActive = active()
      stack.push({ active: ok, parentActive, matched: ok })
    } else if (tag === 'else') {
      const top = stack[stack.length - 1]
      if (top) { top.active = !top.matched; top.matched = true }
    } else if (stack.length) {
      stack.pop()
    }
  }
  if (active()) out += src.slice(last)
  // Collapse blank lines left by removed blocks
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
}

/** Replaces {{name}} / {{name|fallback}}. */
export function substitute(src: string, vars: RenderData['vars'], mode: 'html' | 'text'): string {
  return src.replace(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g, (_, key: string, fallback?: string) => {
    const raw = vars[key]
    if (truthy(raw)) return mode === 'html' ? escMd(esc(String(raw))) : String(raw)
    // In html mode the surrounding text (fallback included) was escaped already
    return fallback ?? ''
  })
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
      const href = safeHref(url)
      return href ? `<a href="${esc(href)}" style="color:inherit;text-decoration:underline">${label}</a>` : label
    })
}

const inlineText = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)')

/* ------------------------------------------------------------ data helpers */

export function absoluteUrl(src: string | undefined | null, site: string): string {
  if (!src) return ''
  if (/^https?:\/\//i.test(src)) return src
  return `${site}${src.startsWith('/') ? '' : '/'}${src}`
}

export function propertyPrice(p: PropertyLite): string {
  if (!p.price || p.price <= 0) return p.price_label || 'Price on request'
  const many = Array.isArray(p.variations) && p.variations.length > 1
  const from = many || /from|start/i.test(p.price_label || '')
  return `${from ? 'From ' : ''}${formatNaira(p.price)}`
}

export function propertyFactsLine(p: PropertyLite): string {
  const f: string[] = [p.type === 'land' ? 'Land' : 'House']
  if (p.type !== 'land') {
    if (p.bedrooms) f.push(`${p.bedrooms} bed${p.bedrooms > 1 ? 's' : ''}`)
    if (p.bathrooms) f.push(`${p.bathrooms} bath${p.bathrooms > 1 ? 's' : ''}`)
    if (p.bq) f.push(`${p.bq} BQ`)
  }
  if (p.land_size) f.push(`${p.land_size.toLocaleString('en-NG')} sqm`)
  return f.join(' · ')
}

export const propertyUrl = (p: { id: string }, site: string) => `${site}/properties/${p.id}`

const statusNote = (s: string) => s === 'sold' ? 'Sold' : s === 'pending' ? 'Offer pending' : ''

/* ----------------------------------------------------------------- blocks */

const FONT = `font-family:Arial,'Helvetica Neue',Helvetica,sans-serif`
const MUTED = '#5f6368'

function button(label: string, href: string, color: string): string {
  const url = safeHref(href)
  if (!url) return ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr>
<td style="border-radius:8px;background:${color}"><a href="${esc(url)}" style="display:inline-block;padding:13px 22px;${FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">${label}</a></td></tr></table>`
}

function rowsTable(rows: [string, string][]): string {
  const body = rows.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:8px 12px 8px 0;${FONT};font-size:14px;color:${MUTED};vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:8px 0;${FONT};font-size:14px;color:#1a1a1a;vertical-align:top">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')
  return body ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;border-top:1px solid #ececec;border-bottom:1px solid #ececec">${body}</table>` : ''
}
const rowsText = (rows: [string, string][]) => rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')

function propertyCard(p: PropertyLite, o: LayoutOptions): string {
  const img = absoluteUrl(p.images?.[0], o.siteUrl)
  const url = propertyUrl(p, o.siteUrl)
  const note = statusNote(p.status)
  const desc = stripHtml(p.description || '').slice(0, 220)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;border:1px solid #e6e6e6;border-radius:12px;overflow:hidden">
${img ? `<tr><td><a href="${esc(url)}"><img src="${esc(img)}" width="536" alt="${esc(p.title)}" style="display:block;width:100%;max-width:536px;height:auto;border:0"></a></td></tr>` : ''}
<tr><td style="padding:18px 20px">
<p style="margin:0 0 4px;${FONT};font-size:13px;color:${MUTED}">${esc(p.district)}${p.address ? ` · ${esc(p.address)}` : ''}</p>
<p style="margin:0 0 6px;${FONT};font-size:18px;font-weight:bold;color:#1a1a1a"><a href="${esc(url)}" style="color:#1a1a1a;text-decoration:none">${esc(p.title)}</a></p>
<p style="margin:0 0 6px;${FONT};font-size:17px;font-weight:bold;color:${o.brandColor}">${esc(propertyPrice(p))}${note ? ` <span style="font-size:13px;color:#b45309">(${note})</span>` : ''}</p>
<p style="margin:0;${FONT};font-size:14px;color:${MUTED}">${esc(propertyFactsLine(p))}</p>
${desc ? `<p style="margin:10px 0 0;${FONT};font-size:14px;line-height:1.55;color:#3c4043">${esc(desc)}${(p.description || '').length > 220 ? '…' : ''}</p>` : ''}
</td></tr></table>`
}

function propertyRow(p: PropertyLite, o: LayoutOptions): string {
  const img = absoluteUrl(p.images?.[0], o.siteUrl)
  const url = propertyUrl(p, o.siteUrl)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px;border:1px solid #e6e6e6;border-radius:10px"><tr>
${img ? `<td width="132" style="padding:10px 0 10px 10px;vertical-align:top"><a href="${esc(url)}"><img src="${esc(img)}" width="122" height="92" alt="${esc(p.title)}" style="display:block;width:122px;height:92px;object-fit:cover;border-radius:6px;border:0"></a></td>` : ''}
<td style="padding:12px 14px;vertical-align:top">
<p style="margin:0 0 2px;${FONT};font-size:12px;color:${MUTED}">${esc(p.district)}</p>
<p style="margin:0 0 4px;${FONT};font-size:15px;font-weight:bold"><a href="${esc(url)}" style="color:#1a1a1a;text-decoration:none">${esc(p.title)}</a></p>
<p style="margin:0 0 2px;${FONT};font-size:14px;font-weight:bold;color:${o.brandColor}">${esc(propertyPrice(p))}</p>
<p style="margin:0;${FONT};font-size:13px;color:${MUTED}">${esc(propertyFactsLine(p))}</p>
</td></tr></table>`
}

const propertyText = (p: PropertyLite, site: string) =>
  `${p.title} (${p.district})\n${propertyPrice(p)} · ${propertyFactsLine(p)}\n${propertyUrl(p, site)}`

function agentCard(a: NonNullable<RenderData['agent']>): string {
  const lines = [
    a.phone ? `<a href="tel:${esc(a.phone.replace(/[^\d+]/g, ''))}" style="color:#1a1a1a">${esc(a.phone)}</a>` : '',
    a.email ? `<a href="mailto:${esc(a.email)}" style="color:#1a1a1a">${esc(a.email)}</a>` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;background:#f6f7f9;border-radius:10px"><tr><td style="padding:14px 18px">
<p style="margin:0 0 2px;${FONT};font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:.04em">Your consultant</p>
<p style="margin:0 0 4px;${FONT};font-size:16px;font-weight:bold;color:#1a1a1a">${esc(a.name)}</p>
${lines ? `<p style="margin:0;${FONT};font-size:14px;color:#1a1a1a">${lines}</p>` : ''}
</td></tr></table>`
}

/* ------------------------------------------------------------------ render */

export function renderEmail(
  tpl: { subject: string; preheader?: string | null; body: string },
  data: RenderData,
  o: LayoutOptions,
): Rendered {
  const vars = data.vars
  const subject = substitute(applyConditions(tpl.subject, vars), vars, 'text').replace(/\s+/g, ' ').trim()
  const preheader = substitute(applyConditions(tpl.preheader || '', vars), vars, 'text').trim()
  const body = applyConditions(tpl.body, vars)

  const wa = o.whatsapp ? `https://wa.me/${o.whatsapp}` : ''
  const html: string[] = []
  const text: string[] = []
  const chunks = body.split(/\n\s*\n/).map(c => c.trim()).filter(Boolean)

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean)
    // A block tag may share a chunk with text; render each block line on its own
    const groups: string[][] = []
    let cur: string[] = []
    for (const l of lines) {
      if (/^\[\[[a-z]+.*\]\]$/.test(l)) { if (cur.length) groups.push(cur); groups.push([l]); cur = [] }
      else cur.push(l)
    }
    if (cur.length) groups.push(cur)

    for (const g of groups) {
      const first = g[0]
      const block = g.length === 1 ? first.match(/^\[\[([a-z]+)\s*(.*)\]\]$/) : null
      if (block) {
        const [, name, arg] = block
        if (name === 'button') {
          const [label, url] = arg.split('|').map(x => x.trim())
          const l = substitute(label || '', vars, 'text'), u = substitute(url || '', vars, 'text')
          const b = button(esc(l), u, o.brandColor)
          if (b) { html.push(b); text.push(`${l}: ${u}`) }
        } else if (name === 'property' && data.property) {
          html.push(propertyCard(data.property, o)); text.push(propertyText(data.property, o.siteUrl))
        } else if (name === 'properties' && data.properties?.length) {
          for (const p of data.properties) { html.push(propertyRow(p, o)); text.push(propertyText(p, o.siteUrl)) }
        } else if (name === 'agent' && data.agent) {
          html.push(agentCard(data.agent))
          text.push(`Your consultant: ${data.agent.name}${data.agent.phone ? `, ${data.agent.phone}` : ''}${data.agent.email ? `, ${data.agent.email}` : ''}`)
        } else if ((name === 'inspection' || name === 'enquiry' || name === 'lead' || name === 'transaction') && data[name]?.rows.length) {
          html.push(rowsTable(data[name]!.rows)); text.push(rowsText(data[name]!.rows))
        } else if (name === 'divider') {
          html.push('<hr style="border:0;border-top:1px solid #ececec;margin:24px 0">'); text.push('---')
        } else if (name === 'whatsapp' && wa) {
          html.push(button('Chat on WhatsApp', wa, '#128C7E')); text.push(`WhatsApp: ${wa}`)
        }
        continue
      }
      if (g.every(l => l.startsWith('- '))) {
        const items = g.map(l => substitute(esc(l.slice(2)), vars, 'html'))
        html.push(`<ul style="margin:0 0 18px;padding-left:22px;${FONT};font-size:16px;line-height:1.6;color:#1a1a1a">${items.map(i => `<li style="margin:0 0 6px">${inline(i)}</li>`).join('')}</ul>`)
        text.push(g.map(l => `• ${inlineText(substitute(l.slice(2), vars, 'text'))}`).join('\n'))
        continue
      }
      const h = first.match(/^(#{1,2})\s+(.*)$/)
      if (h && g.length === 1) {
        const size = h[1].length === 1 ? 22 : 18
        html.push(`<h${h[1].length} style="margin:8px 0 12px;${FONT};font-size:${size}px;line-height:1.3;color:#1a1a1a">${inline(substitute(esc(h[2]), vars, 'html'))}</h${h[1].length}>`)
        text.push(substitute(h[2], vars, 'text').toUpperCase())
        continue
      }
      const para = g.map(l => inline(substitute(esc(l), vars, 'html'))).join('<br>')
      // A paragraph that is only a variable which came out empty disappears
      if (!stripHtml(para).trim()) continue
      html.push(`<p style="margin:0 0 18px;${FONT};font-size:16px;line-height:1.6;color:#1a1a1a">${para}</p>`)
      text.push(g.map(l => inlineText(substitute(l, vars, 'text'))).join('\n'))
    }
  }

  return {
    subject: subject || o.brandName,
    preheader,
    html: layout(subject, preheader, html.join('\n'), o),
    text: [text.join('\n\n'), footerText(o)].join('\n\n---\n'),
  }
}

function footerText(o: LayoutOptions): string {
  const lines = [o.brandName, o.address, o.phone].filter(Boolean) as string[]
  if (o.audience === 'marketing' || o.audience === 'service') {
    if (o.prefsUrl) lines.push(`Email preferences: ${o.prefsUrl}`)
    if (o.unsubscribeUrl) lines.push(`Unsubscribe: ${o.unsubscribeUrl}`)
  }
  return lines.join('\n')
}

function layout(subject: string, preheader: string, content: string, o: LayoutOptions): string {
  // SVG logos don't show in Gmail or Outlook, so only raster logos are used
  const logo = o.logoUrl && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(o.logoUrl) ? absoluteUrl(o.logoUrl, o.siteUrl) : ''
  const header = logo
    ? `<img src="${esc(logo)}" alt="${esc(o.brandName)}" height="36" style="display:block;height:36px;width:auto;border:0">`
    : `<span style="${FONT};font-size:20px;font-weight:bold;color:${o.brandColor};letter-spacing:-.01em">${esc(o.brandName)}</span>`
  const why = o.audience === 'marketing'
    ? 'You’re receiving this because you subscribed to updates from us.'
    : o.audience === 'service'
      ? 'You’re receiving this because you made an enquiry with us.'
      : o.audience === 'internal' ? 'Internal notification for the sales team.' : ''
  const links = (o.audience === 'marketing' || o.audience === 'service') && (o.prefsUrl || o.unsubscribeUrl)
    ? `<p style="margin:10px 0 0;${FONT};font-size:12px;color:${MUTED}">${o.prefsUrl ? `<a href="${esc(o.prefsUrl)}" data-notrack="1" style="color:${MUTED}">Email preferences</a>` : ''}${o.prefsUrl && o.unsubscribeUrl ? ' &nbsp;·&nbsp; ' : ''}${o.unsubscribeUrl ? `<a href="${esc(o.unsubscribeUrl)}" data-notrack="1" style="color:${MUTED}">Unsubscribe</a>` : ''}</p>`
    : ''
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<title>${esc(subject)}</title>
<style>
  @media (max-width:620px){ .wrap{padding:12px 0 !important} .card{border-radius:0 !important} .pad{padding:24px 18px !important} }
  a{color:${o.brandColor}}
</style>
</head>
<body style="margin:0;padding:0;background:#f2f3f5;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f3f5">
<tr><td align="center" class="wrap" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px">
<tr><td class="pad" style="padding:26px 32px 6px">${header}</td></tr>
<tr><td class="pad" style="padding:18px 32px 12px">${content}</td></tr>
<tr><td class="pad" style="padding:18px 32px 26px;border-top:1px solid #ececec">
<p style="margin:0;${FONT};font-size:13px;color:#1a1a1a;font-weight:bold">${esc(o.brandName)}</p>
<p style="margin:4px 0 0;${FONT};font-size:12px;line-height:1.5;color:${MUTED}">${[o.address, o.phone].filter(Boolean).map(esc).join(' · ')}</p>
${why ? `<p style="margin:10px 0 0;${FONT};font-size:12px;line-height:1.5;color:${MUTED}">${why}</p>` : ''}
${links}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
