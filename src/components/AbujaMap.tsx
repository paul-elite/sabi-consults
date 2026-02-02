'use client'

import { useEffect, useRef, useState } from 'react'
import { Property } from '@/lib/types'

interface AbujaMapProps {
  properties?: Property[]
  selectedProperty?: Property
  className?: string
  interactive?: boolean
  showPopups?: boolean
  fullPage?: boolean
}

// Abuja center coordinates
const ABUJA_CENTER: [number, number] = [9.0579, 7.4951]
const DEFAULT_ZOOM = 11

// Format price
function formatPrice(price: number): string {
  if (price >= 1000000000) {
    return `₦${(price / 1000000000).toFixed(1)}B`
  }
  return `₦${(price / 1000000).toFixed(0)}M`
}

export default function AbujaMap({
  properties = [],
  selectedProperty,
  className = '',
  interactive = true,
  showPopups = true,
  fullPage = false,
}: AbujaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import for Leaflet (client-side only)
    import('leaflet').then((L) => {
      // Blue marker for houses
      const houseIcon = L.divIcon({
        html: `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24c0-8.836-7.164-16-16-16z" fill="#0055CC"/>
          <path d="M16 8l-8 6v10h5v-6h6v6h5V14l-8-6z" fill="#ffffff"/>
        </svg>`,
        className: 'custom-marker-house',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
      })

      // Green marker for land
      const landIcon = L.divIcon({
        html: `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24c0-8.836-7.164-16-16-16z" fill="#059669"/>
          <rect x="9" y="9" width="14" height="14" rx="1" stroke="#ffffff" stroke-width="2" fill="none"/>
          <line x1="16" y1="9" x2="16" y2="23" stroke="#ffffff" stroke-width="1.5"/>
          <line x1="9" y1="16" x2="23" y2="16" stroke="#ffffff" stroke-width="1.5"/>
        </svg>`,
        className: 'custom-marker-land',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
      })

      // Initialize map
      const map = L.map(mapRef.current!, {
        center: selectedProperty
          ? [selectedProperty.latitude, selectedProperty.longitude]
          : ABUJA_CENTER,
        zoom: selectedProperty ? 14 : fullPage ? 12 : DEFAULT_ZOOM,
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
      })

      // Use CartoDB Positron for clean look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setIsLoaded(true)

      // Add property markers
      if (selectedProperty) {
        const icon = selectedProperty.type === 'land' ? landIcon : houseIcon
        const marker = L.marker([selectedProperty.latitude, selectedProperty.longitude], {
          icon,
        }).addTo(map)

        if (showPopups) {
          marker.bindPopup(`
            <div style="font-family: system-ui, sans-serif; min-width: 200px;">
              <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0; color: #1a1a1a;">${selectedProperty.title}</p>
              <p style="font-size: 12px; color: #666; margin: 0;">${selectedProperty.district}</p>
            </div>
          `)
        }

        markersRef.current.push(marker)
      } else if (properties.length > 0) {
        properties.forEach((property) => {
          const icon = property.type === 'land' ? landIcon : houseIcon
          const marker = L.marker([property.latitude, property.longitude], {
            icon,
          }).addTo(map)

          if (showPopups) {
            const typeLabel = property.type === 'land' ? 'Land' : 'House'
            const details = property.type === 'house' && property.bedrooms
              ? `${property.bedrooms} Bed${property.bedrooms > 1 ? 's' : ''}`
              : property.landSize
                ? `${property.landSize.toLocaleString()} sqm`
                : ''

            marker.bindPopup(`
              <div style="font-family: system-ui, sans-serif; min-width: 220px;">
                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                  <span style="background: ${property.type === 'land' ? '#059669' : '#0055CC'}; color: white; font-size: 10px; padding: 2px 6px; text-transform: uppercase; font-weight: 500;">${typeLabel}</span>
                  ${property.featured ? '<span style="background: #f59e0b; color: white; font-size: 10px; padding: 2px 6px; text-transform: uppercase; font-weight: 500;">Featured</span>' : ''}
                </div>
                <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0; color: #1a1a1a;">${property.title}</p>
                <p style="font-size: 12px; color: #666; margin: 0 0 8px 0;">${property.address}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #eee;">
                  <span style="font-weight: 600; color: #0055CC; font-size: 14px;">${formatPrice(property.price)}</span>
                  ${details ? `<span style="font-size: 12px; color: #666;">${details}</span>` : ''}
                </div>
                <a href="/properties/${property.id}" style="display: block; text-align: center; margin-top: 10px; padding: 8px; background: #0055CC; color: white; text-decoration: none; font-size: 12px; font-weight: 500;">View Property</a>
              </div>
            `, { maxWidth: 280 })
          }

          markersRef.current.push(marker)
        })

        // Fit bounds to show all markers
        if (properties.length > 1) {
          const bounds = L.latLngBounds(
            properties.map((p) => [p.latitude, p.longitude])
          )
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [properties, selectedProperty, interactive, showPopups, fullPage])

  return (
    <div className={`w-full h-full min-h-[300px] relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center z-10">
          <div className="text-neutral-400 text-sm">Loading map...</div>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-full"
      />
    </div>
  )
}
