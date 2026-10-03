// Brand settings shared by server and browser code (no database access here).
// Brand settings: name, logo and colour palette.
// Stored as rows in the `site_settings` table and editable by a super admin
// at /admin/branding. Changes apply across the whole site without a redeploy.

export interface Brand {
  name: string
  tagline: string
  logoUrl: string        // shown on the brand-coloured header
  logoDarkUrl: string    // optional version for light backgrounds (footer, admin)
  faviconUrl: string
  colorPrimary: string   // buttons, links, header
  colorInk: string       // headings and body text
  colorSurface: string   // soft section backgrounds
  // Typography
  fontHeading: string    // font family for headings
  fontBody: string       // font family for body text
  fontSizeBase: number   // base font size in px (default 16)
  fontSizeScale: number  // scale ratio for headings (default 1.25)
  lineHeight: number     // base line height (default 1.5)
  letterSpacing: number  // letter spacing in em (default 0)
  // Additional branding
  borderRadius: number   // base border radius in px (default 8)
  shadowIntensity: number // shadow opacity 0-100 (default 6)
}

export const BRAND_KEYS: Record<keyof Brand, string> = {
  name: 'brand_name',
  tagline: 'brand_tagline',
  logoUrl: 'brand_logo_url',
  logoDarkUrl: 'brand_logo_dark_url',
  faviconUrl: 'brand_favicon_url',
  colorPrimary: 'brand_color_primary',
  colorInk: 'brand_color_ink',
  colorSurface: 'brand_color_surface',
  fontHeading: 'brand_font_heading',
  fontBody: 'brand_font_body',
  fontSizeBase: 'brand_font_size_base',
  fontSizeScale: 'brand_font_size_scale',
  lineHeight: 'brand_line_height',
  letterSpacing: 'brand_letter_spacing',
  borderRadius: 'brand_border_radius',
  shadowIntensity: 'brand_shadow_intensity',
}

// Available font options
export const FONT_OPTIONS = [
  { value: 'system-ui', label: 'System Default', stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { value: 'inter', label: 'Inter', stack: '"Inter", system-ui, sans-serif' },
  { value: 'plus-jakarta', label: 'Plus Jakarta Sans', stack: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { value: 'dm-sans', label: 'DM Sans', stack: '"DM Sans", system-ui, sans-serif' },
  { value: 'poppins', label: 'Poppins', stack: '"Poppins", system-ui, sans-serif' },
  { value: 'nunito', label: 'Nunito', stack: '"Nunito", system-ui, sans-serif' },
  { value: 'lato', label: 'Lato', stack: '"Lato", system-ui, sans-serif' },
  { value: 'open-sans', label: 'Open Sans', stack: '"Open Sans", system-ui, sans-serif' },
  { value: 'roboto', label: 'Roboto', stack: '"Roboto", system-ui, sans-serif' },
  { value: 'montserrat', label: 'Montserrat', stack: '"Montserrat", system-ui, sans-serif' },
  { value: 'playfair', label: 'Playfair Display', stack: '"Playfair Display", Georgia, serif' },
  { value: 'merriweather', label: 'Merriweather', stack: '"Merriweather", Georgia, serif' },
  { value: 'source-serif', label: 'Source Serif Pro', stack: '"Source Serif Pro", Georgia, serif' },
]

// Defaults can be set per deployment with env vars, so a new copy of the site
// starts with the right name even before the database is configured.
export const DEFAULT_BRAND: Brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'Sabi Consults',
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'Helping people find their way home in Abuja',
  logoUrl: '/logo.svg',
  logoDarkUrl: '',
  faviconUrl: '',
  colorPrimary: process.env.NEXT_PUBLIC_BRAND_COLOR || '#0055CC',
  colorInk: '#1a1a1a',
  colorSurface: '#f8f6f3',
  fontHeading: 'system-ui',
  fontBody: 'system-ui',
  fontSizeBase: 16,
  fontSizeScale: 1.25,
  lineHeight: 1.5,
  letterSpacing: 0,
  borderRadius: 8,
  shadowIntensity: 6,
}

export const PALETTES: { name: string; primary: string; ink: string; surface: string }[] = [
  { name: 'Sabi blue', primary: '#0055CC', ink: '#1a1a1a', surface: '#f8f6f3' },
  { name: 'Abuja green', primary: '#0F6B4B', ink: '#14201b', surface: '#f3f6f2' },
  { name: 'Aso rock', primary: '#7A4E2D', ink: '#1f1a16', surface: '#f7f3ee' },
  { name: 'Midnight', primary: '#1E2A44', ink: '#141821', surface: '#f2f3f6' },
  { name: 'Terracotta', primary: '#B4472C', ink: '#1e1715', surface: '#f8f2ee' },
  { name: 'Royal purple', primary: '#5B3A8E', ink: '#1b1622', surface: '#f5f2f8' },
]

const HEX = /^#[0-9a-fA-F]{6}$/
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v)

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
/** White or near-black, whichever reads better on the given colour. */
export function onColor(hex: string) {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#111111') ? '#ffffff' : '#111111'
}

/** Get font stack from font value */
export function getFontStack(fontValue: string): string {
  const font = FONT_OPTIONS.find(f => f.value === fontValue)
  return font?.stack || FONT_OPTIONS[0].stack
}

/** CSS custom properties consumed by Tailwind theme colours in globals.css. */
export function brandCss(b: Brand): string {
  const p = isHex(b.colorPrimary) ? b.colorPrimary : DEFAULT_BRAND.colorPrimary
  const i = isHex(b.colorInk) ? b.colorInk : DEFAULT_BRAND.colorInk
  const s = isHex(b.colorSurface) ? b.colorSurface : DEFAULT_BRAND.colorSurface
  const fh = getFontStack(b.fontHeading || DEFAULT_BRAND.fontHeading)
  const fb = getFontStack(b.fontBody || DEFAULT_BRAND.fontBody)
  const fsBase = b.fontSizeBase || DEFAULT_BRAND.fontSizeBase
  const fsScale = b.fontSizeScale || DEFAULT_BRAND.fontSizeScale
  const lh = b.lineHeight || DEFAULT_BRAND.lineHeight
  const ls = b.letterSpacing ?? DEFAULT_BRAND.letterSpacing
  const br = b.borderRadius ?? DEFAULT_BRAND.borderRadius
  const sh = b.shadowIntensity ?? DEFAULT_BRAND.shadowIntensity

  return `html:root{
--color-brand:${p};
--color-on-brand:${onColor(p)};
--color-ink:${i};
--color-surface:${s};
--font-heading:${fh};
--font-body:${fb};
--font-size-base:${fsBase}px;
--font-size-scale:${fsScale};
--line-height:${lh};
--letter-spacing:${ls}em;
--radius-base:${br}px;
--shadow-opacity:${sh / 100};
}`.replace(/\n/g, '')
}

const NUMERIC_FIELDS: (keyof Brand)[] = ['fontSizeBase', 'fontSizeScale', 'lineHeight', 'letterSpacing', 'borderRadius', 'shadowIntensity']

export function brandFromRows(rows: { key: string; value: string }[] | null | undefined): Brand {
  const map = Object.fromEntries((rows || []).map(r => [r.key, r.value]))
  const out = { ...DEFAULT_BRAND }
  for (const [field, key] of Object.entries(BRAND_KEYS) as [keyof Brand, string][]) {
    const v = map[key]
    if (typeof v === 'string' && v.trim() !== '') {
      if (NUMERIC_FIELDS.includes(field)) {
        const num = parseFloat(v)
        if (!isNaN(num)) (out as Record<string, unknown>)[field] = num
      } else {
        (out as Record<string, unknown>)[field] = v
      }
    }
  }
  for (const f of ['colorPrimary', 'colorInk', 'colorSurface'] as const) {
    if (!isHex(out[f])) out[f] = DEFAULT_BRAND[f]
  }
  return out
}

