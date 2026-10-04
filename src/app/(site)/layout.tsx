import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { LeadCaptureProvider } from '@/components/LeadCaptureProvider'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LeadCaptureProvider>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </LeadCaptureProvider>
  )
}
