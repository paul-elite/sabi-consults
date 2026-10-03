import type { Metadata, Viewport } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import { getBrand, brandCss } from '@/lib/brand'
import { getSettings } from '@/lib/settings'
import { BrandProvider } from '@/components/BrandProvider'
import './globals.css'

// Body: Inter - designed for screens, excellent readability
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Headings: Cormorant Garamond - elegant high-contrast serif for luxury feel
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
})

// Brand settings can change at any time from /admin/branding
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand()
  const title = `${brand.name} | Real estate in Abuja`
  return {
    title: { default: title, template: `%s | ${brand.name}` },
    description: brand.tagline,
    keywords: 'Abuja real estate, land for sale Abuja, Asokoro, Guzape, Lugbe, Kubwa, Wuse 2, property investment Nigeria',
    icons: brand.faviconUrl ? { icon: brand.faviconUrl } : undefined,
    openGraph: { title, description: brand.tagline, type: 'website', locale: 'en_NG', siteName: brand.name },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const brand = await getBrand()
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: brand.colorPrimary }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [brand, settings] = await Promise.all([getBrand(), getSettings()])
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <head>
        <style id="brand-vars" dangerouslySetInnerHTML={{ __html: brandCss(brand) }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <BrandProvider brand={brand} settings={settings}>
          {children}
        </BrandProvider>
      </body>
    </html>
  )
}
