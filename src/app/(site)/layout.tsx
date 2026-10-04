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
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
    </LeadCaptureProvider>
  )
}
