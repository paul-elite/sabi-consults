import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Sabi Consults | Premium Real Estate in Abuja',
  description: 'Your trusted partner for premium real estate in Abuja. Expert property consulting, sales, and investment advisory in Maitama, Asokoro, Wuse II, and beyond.',
  keywords: 'Abuja real estate, property consulting, Maitama properties, Asokoro homes, Wuse II real estate, Nigeria property investment',
  openGraph: {
    title: 'Sabi Consults | Premium Real Estate in Abuja',
    description: 'Your trusted partner for premium real estate in Abuja.',
    type: 'website',
    locale: 'en_NG',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
