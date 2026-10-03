'use client'

import { usePageTracking } from '@/lib/analytics'
import { Suspense } from 'react'

function AnalyticsTrackerInner() {
  usePageTracking()
  return null
}

// Wrap in Suspense because useSearchParams requires it
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTrackerInner />
      </Suspense>
      {children}
    </>
  )
}
