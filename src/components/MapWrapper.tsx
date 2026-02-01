'use client'

import dynamic from 'next/dynamic'
import { Property } from '@/lib/types'

const AbujaMap = dynamic(() => import('./AbujaMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />,
})

interface MapWrapperProps {
  properties?: Property[]
  selectedProperty?: Property
  className?: string
  interactive?: boolean
}

export default function MapWrapper(props: MapWrapperProps) {
  return <AbujaMap {...props} />
}
