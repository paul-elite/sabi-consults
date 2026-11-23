import type { Metadata } from 'next'

// Personal pages reached from links in emails: keep them out of search results
export const metadata: Metadata = { title: 'Email preferences', robots: { index: false, follow: false } }

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return children
}
