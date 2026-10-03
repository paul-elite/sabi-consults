'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireRole } from '@/components/admin/AdminNav'
import { PALETTES, FONT_OPTIONS, getFontStack, brandCss, contrastRatio, isHex, onColor, DEFAULT_BRAND, type Brand } from '@/lib/brand-shared'

type Field = keyof Brand

function Uploader({ label, hint, value, onChange, dark }: { label: string; hint: string; value: string; onChange: (v: string) => void; dark?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const upload = async (file: File) => {
    setError('')
    if (file.size > 2 * 1024 * 1024) { setError('Use an image under 2 MB.'); return }
    setBusy(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'brand')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onChange(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div>
      <p className="text-sm font-medium text-ink mb-1">{label}</p>
      <p className="text-xs text-neutral-500 mb-3">{hint}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="rounded-xl h-16 w-40 border border-neutral-200 grid place-items-center overflow-hidden" style={{ background: dark || '#fff' }}>
          {value
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value} alt="" className="max-h-12 max-w-36 object-contain" />
            : <span className="text-xs text-neutral-400">None</span>}
        </div>
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="rounded-lg h-11 px-4 border border-neutral-300 text-sm hover:border-ink disabled:opacity-50">
          {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </button>
        {value && <button type="button" onClick={() => onChange('')} className="h-11 px-3 text-sm text-neutral-500 hover:text-red-600">Remove</button>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="sr-only"
          onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}

function ColorField({ label, hint, value, onChange, error }: { label: string; hint: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      <p className="text-xs text-neutral-500 mb-2">{hint}</p>
      <div className="flex items-center gap-2">
        <input type="color" value={isHex(value) ? value : '#000000'} onChange={e => onChange(e.target.value)}
          className="rounded-lg h-11 w-14 border border-neutral-300 bg-white p-1 cursor-pointer" aria-label={`${label} picker`} />
        <input value={text} onChange={e => { setText(e.target.value); if (isHex(e.target.value)) onChange(e.target.value) }}
          className={`rounded-lg h-11 w-32 px-3 border font-mono text-sm uppercase ${error || !isHex(text) ? 'border-red-400' : 'border-neutral-300'}`}
          aria-label={`${label} hex value`} maxLength={7} />
      </div>
      {(error || !isHex(text)) && <p className="text-xs text-red-600 mt-1">{error || 'Use a colour like #0055CC.'}</p>}
    </div>
  )
}

function SliderField({ label, hint, value, onChange, min, max, step, unit, showValue }: {
  label: string; hint: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string; showValue?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-ink">{label}</label>
        {showValue !== false && <span className="text-sm text-neutral-500">{value}{unit || ''}</span>}
      </div>
      <p className="text-xs text-neutral-500 mb-2">{hint}</p>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand" />
    </div>
  )
}

function SelectField({ label, hint, value, onChange, options }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      <p className="text-xs text-neutral-500 mb-2">{hint}</p>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="form-input form-select w-full h-11">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function BrandingEditor() {
  const router = useRouter()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [saved, setSaved] = useState<Brand | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/branding', { cache: 'no-store' }).then(r => r.json()).then((b: Brand) => { setBrand(b); setSaved(b) })
      .catch(() => setMessage({ type: 'error', text: 'Couldn’t load the current branding.' }))
  }, [])

  if (!brand) return <div className="min-h-[50vh] grid place-items-center text-neutral-400 animate-pulse">Loading branding…</div>

  const set = (f: Field, v: string) => { setBrand({ ...brand, [f]: v }); setMessage(null) }
  const setNum = (f: Field, v: number) => { setBrand({ ...brand, [f]: v }); setMessage(null) }
  const dirty = JSON.stringify(brand) !== JSON.stringify(saved)
  const textContrast = contrastRatio(brand.colorInk, '#ffffff')
  const btnContrast = contrastRatio(brand.colorPrimary, onColor(brand.colorPrimary))

  const save = async () => {
    setSaving(true); setMessage(null); setFieldErrors({})
    try {
      const res = await fetch('/api/branding', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brand) })
      const data = await res.json()
      if (!res.ok) { setFieldErrors(data.fields || {}); throw new Error(data.error || 'Save failed') }
      setSaved(brand)
      // Apply immediately in this tab; the rest of the site refreshes on next load
      const tag = document.getElementById('brand-vars')
      if (tag) tag.innerHTML = brandCss(brand)
      router.refresh()
      setMessage({ type: 'success', text: 'Branding saved. The website now uses the new name, logo and colours.' })
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const previewVars = {
    ['--p' as string]: brand.colorPrimary,
    ['--on' as string]: onColor(brand.colorPrimary),
    ['--ink' as string]: brand.colorInk,
    ['--s' as string]: brand.colorSurface,
    ['--fh' as string]: getFontStack(brand.fontHeading),
    ['--fb' as string]: getFontStack(brand.fontBody),
    ['--fs' as string]: `${brand.fontSizeBase}px`,
    ['--lh' as string]: brand.lineHeight,
    ['--ls' as string]: `${brand.letterSpacing}em`,
    ['--r' as string]: `${brand.borderRadius}px`,
    ['--sh' as string]: brand.shadowIntensity / 100,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-light text-ink">Branding</h1>
        <p className="text-sm text-neutral-500 mt-1">Change the company name, logo and colours. Every page of the website updates when you save.</p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6 space-y-5">
            <h2 className="font-semibold text-ink">Identity</h2>
            <div>
              <label htmlFor="b-name" className="text-sm font-medium text-ink">Company name</label>
              <input id="b-name" value={brand.name} onChange={e => set('name', e.target.value)} maxLength={60}
                className={`form-input mt-2 ${fieldErrors.name ? 'border-red-400' : ''}`} />
              {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="b-tag" className="text-sm font-medium text-ink">Tagline</label>
              <p className="text-xs text-neutral-500">Used in the footer and search results.</p>
              <input id="b-tag" value={brand.tagline} onChange={e => set('tagline', e.target.value)} maxLength={160}
                className="form-input mt-2" />
            </div>
          </section>

          <section className="card p-5 sm:p-6 space-y-6">
            <h2 className="font-semibold text-ink">Logo</h2>
            <Uploader label="Main logo" hint="Shown on the coloured header and footer. A white or light logo works best. SVG or PNG, under 2 MB."
              value={brand.logoUrl} onChange={v => set('logoUrl', v)} dark={brand.colorPrimary} />
            <Uploader label="Logo for light backgrounds (optional)" hint="A dark version, used where the background is white."
              value={brand.logoDarkUrl} onChange={v => set('logoDarkUrl', v)} />
            <Uploader label="Browser tab icon (optional)" hint="A square image, at least 64 × 64 pixels."
              value={brand.faviconUrl} onChange={v => set('faviconUrl', v)} />
            {!brand.logoUrl && <p className="text-sm text-neutral-500">With no logo, the company name is shown in type instead.</p>}
          </section>

          <section className="card p-5 sm:p-6 space-y-6">
            <h2 className="font-semibold text-ink">Colour palette</h2>
            <div>
              <p className="text-sm font-medium text-ink mb-3">Start from a palette</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PALETTES.map(p => {
                  const active = p.primary.toLowerCase() === brand.colorPrimary.toLowerCase() && p.ink.toLowerCase() === brand.colorInk.toLowerCase()
                  return (
                    <button key={p.name} type="button" aria-pressed={active}
                      onClick={() => setBrand({ ...brand, colorPrimary: p.primary, colorInk: p.ink, colorSurface: p.surface })}
                      className={`rounded-lg flex items-center gap-3 p-3 border text-left text-sm min-h-12 ${active ? 'border-ink ring-1 ring-ink' : 'border-neutral-200 hover:border-neutral-400'}`}>
                      <span className="flex -space-x-1.5 shrink-0">
                        {[p.primary, p.ink, p.surface].map(c => <span key={c} className="w-5 h-5 rounded-full border border-white" style={{ background: c }} />)}
                      </span>
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              <ColorField label="Primary" hint="Header, buttons and links" value={brand.colorPrimary} onChange={v => set('colorPrimary', v)} error={fieldErrors.colorPrimary} />
              <ColorField label="Text" hint="Headings and body copy" value={brand.colorInk} onChange={v => set('colorInk', v)} error={fieldErrors.colorInk} />
              <ColorField label="Soft background" hint="Alternate sections" value={brand.colorSurface} onChange={v => set('colorSurface', v)} error={fieldErrors.colorSurface} />
            </div>
            {(textContrast < 7 || btnContrast < 3) && (
              <div className="rounded-lg p-3 bg-amber-50 text-amber-800 text-sm">
                {textContrast < 7 && <p>The text colour is quite light, so body copy may be hard to read. A darker shade is safer.</p>}
                {btnContrast < 3 && <p>Button text may be hard to read on this primary colour. Try a deeper shade.</p>}
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-6 space-y-6">
            <h2 className="font-semibold text-ink">Typography</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <SelectField
                label="Heading font"
                hint="Used for titles and headers"
                value={brand.fontHeading}
                onChange={v => set('fontHeading', v)}
                options={FONT_OPTIONS}
              />
              <SelectField
                label="Body font"
                hint="Used for paragraphs and UI"
                value={brand.fontBody}
                onChange={v => set('fontBody', v)}
                options={FONT_OPTIONS}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <SliderField
                label="Base font size"
                hint="Standard text size across the site"
                value={brand.fontSizeBase}
                onChange={v => setNum('fontSizeBase', v)}
                min={14} max={20} step={1} unit="px"
              />
              <SliderField
                label="Heading scale"
                hint="How much larger each heading level is"
                value={brand.fontSizeScale}
                onChange={v => setNum('fontSizeScale', v)}
                min={1.1} max={1.5} step={0.05} unit="x"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <SliderField
                label="Line height"
                hint="Space between lines of text"
                value={brand.lineHeight}
                onChange={v => setNum('lineHeight', v)}
                min={1.2} max={2} step={0.1}
              />
              <SliderField
                label="Letter spacing"
                hint="Space between characters"
                value={brand.letterSpacing}
                onChange={v => setNum('letterSpacing', v)}
                min={-0.05} max={0.1} step={0.01} unit="em"
              />
            </div>
            {/* Typography preview */}
            <div className="rounded-lg border border-neutral-200 p-4 bg-neutral-50">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3">Preview</p>
              <div style={{ fontFamily: getFontStack(brand.fontHeading), lineHeight: brand.lineHeight, letterSpacing: `${brand.letterSpacing}em` }}>
                <p className="text-2xl font-semibold text-ink mb-2" style={{ fontSize: `${brand.fontSizeBase * Math.pow(brand.fontSizeScale, 3)}px` }}>Heading Text</p>
              </div>
              <div style={{ fontFamily: getFontStack(brand.fontBody), fontSize: `${brand.fontSizeBase}px`, lineHeight: brand.lineHeight, letterSpacing: `${brand.letterSpacing}em` }}>
                <p className="text-ink">This is body text showing how your typography choices look in practice. Good typography improves readability and creates visual hierarchy.</p>
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6 space-y-6">
            <h2 className="font-semibold text-ink">Styling</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <SliderField
                label="Corner radius"
                hint="Roundness of buttons and cards"
                value={brand.borderRadius}
                onChange={v => setNum('borderRadius', v)}
                min={0} max={24} step={2} unit="px"
              />
              <SliderField
                label="Shadow intensity"
                hint="How prominent shadows appear"
                value={brand.shadowIntensity}
                onChange={v => setNum('shadowIntensity', v)}
                min={0} max={20} step={1} unit="%"
              />
            </div>
            {/* Styling preview */}
            <div className="flex items-center gap-4 flex-wrap">
              <div
                className="px-5 py-2.5 text-sm font-medium text-white"
                style={{
                  backgroundColor: brand.colorPrimary,
                  borderRadius: `${brand.borderRadius}px`,
                  boxShadow: `0 4px 12px rgba(0,0,0,${brand.shadowIntensity / 100})`
                }}
              >
                Button
              </div>
              <div
                className="p-4 bg-white border border-neutral-200"
                style={{
                  borderRadius: `${brand.borderRadius}px`,
                  boxShadow: `0 4px 12px rgba(0,0,0,${brand.shadowIntensity / 100})`
                }}
              >
                <p className="text-sm text-ink font-medium">Card element</p>
                <p className="text-xs text-neutral-500">With shadow preview</p>
              </div>
            </div>
          </section>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-20 space-y-3">
          <p className="text-sm font-medium text-ink">Preview</p>
          <div style={previewVars} className="overflow-hidden bg-white text-[13px]" >
            <div
              className="flex items-center justify-between px-4 h-14"
              style={{ background: 'var(--p)', color: 'var(--on)', borderRadius: `var(--r) var(--r) 0 0` }}
            >
              {brand.logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={brand.logoUrl} alt="" className="h-7 w-auto max-w-40 object-contain" />
                : <span style={{ fontFamily: 'var(--fh)', fontSize: '16px' }}>{brand.name || 'Company name'}</span>}
              <HugeiconsIcon icon={Menu01Icon} className="w-5 h-5 opacity-80" aria-hidden="true" />
            </div>
            <div
              className="p-5 border-x border-neutral-200"
              style={{ color: 'var(--ink)', fontFamily: 'var(--fb)', fontSize: 'var(--fs)', lineHeight: 'var(--lh)', letterSpacing: 'var(--ls)' }}
            >
              <p
                className="leading-tight mb-2 font-semibold"
                style={{ fontFamily: 'var(--fh)', fontSize: `calc(var(--fs) * 1.5)` }}
              >
                Find land and homes in Abuja
              </p>
              <p className="opacity-70 mb-4">Plots in Asokoro, Guzape and Kubwa with flexible payment plans.</p>
              <span
                className="inline-block px-4 py-2.5 font-medium"
                style={{
                  background: 'var(--p)',
                  color: 'var(--on)',
                  borderRadius: 'var(--r)',
                  boxShadow: `0 4px 12px rgba(0,0,0,var(--sh))`
                }}
              >
                View properties
              </span>
            </div>
            <div
              className="p-5 border-x border-neutral-200"
              style={{ background: 'var(--s)', color: 'var(--ink)', fontFamily: 'var(--fb)', fontSize: 'var(--fs)', lineHeight: 'var(--lh)' }}
            >
              <div
                className="overflow-hidden bg-white border border-black/5"
                style={{ borderRadius: 'var(--r)', boxShadow: `0 4px 12px rgba(0,0,0,var(--sh))` }}
              >
                <div className="h-24" style={{ background: 'linear-gradient(135deg, var(--s), #d9d4cc)' }} />
                <div className="p-3">
                  <p className="font-semibold" style={{ fontFamily: 'var(--fh)' }}>Emerald Grove City</p>
                  <p className="opacity-60">Asokoro, from ₦9M</p>
                  <p className="mt-2 font-medium" style={{ color: 'var(--p)' }}>View details <HugeiconsIcon icon={ArrowRight02Icon} className="inline w-4 h-4" aria-hidden="true" /></p>
                </div>
              </div>
            </div>
            <div
              className="px-4 py-3 text-xs border-x border-b border-neutral-200"
              style={{ background: 'var(--p)', color: 'var(--on)', borderRadius: `0 0 var(--r) var(--r)` }}
            >
              © {new Date().getFullYear()} {brand.name}
            </div>
          </div>
        </aside>
      </div>

      {/* Save bar: fixed on phones, inline on desktop */}
      <div className="fixed lg:static bottom-0 inset-x-0 bg-white border-t lg:border-0 border-neutral-200 px-4 py-3 lg:px-0 lg:py-0 lg:mt-6 pb-safe z-40">
        {message && (
          <p role="status" className={`text-sm mb-2 ${message.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={!dirty || saving}
            className="rounded-lg flex-1 lg:flex-none h-12 px-6 bg-brand text-on-brand font-medium disabled:opacity-40">
            {saving ? 'Saving…' : dirty ? 'Save branding' : 'Saved'}
          </button>
          {dirty && (
            <button type="button" onClick={() => saved && setBrand(saved)} className="rounded-lg h-12 px-4 border border-neutral-300 text-sm">Undo changes</button>
          )}
          <button type="button" className="hidden sm:block h-12 px-4 text-sm text-neutral-500 hover:text-ink ml-auto"
            onClick={() => { if (confirm('Reset name, logo and colours to the original defaults? You can still undo before saving.')) setBrand({ ...DEFAULT_BRAND }) }}>
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BrandingPage() {
  return <RequireRole min="super_admin"><BrandingEditor /></RequireRole>
}
