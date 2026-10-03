'use client'

import { createContext, useContext } from 'react'
import type { Brand } from '@/lib/brand-shared'
import type { SiteSettings } from '@/lib/settings'

interface Ctx { brand: Brand; settings: SiteSettings }
const BrandContext = createContext<Ctx | null>(null)

export function BrandProvider({ brand, settings, children }: Ctx & { children: React.ReactNode }) {
  return <BrandContext.Provider value={{ brand, settings }}>{children}</BrandContext.Provider>
}

export function useBrand(): Brand {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used inside <BrandProvider>')
  return ctx.brand
}

export function useSiteSettings(): SiteSettings {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useSiteSettings must be used inside <BrandProvider>')
  return ctx.settings
}
