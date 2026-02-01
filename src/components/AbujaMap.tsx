'use client'

import { useEffect, useRef } from 'react'
import { Property } from '@/lib/types'
import 'leaflet/dist/leaflet.css'

interface AbujaMapProps {
  properties?: Property[]
  selectedProperty?: Property
  className?: string
  interactive?: boolean
}

// Abuja center coordinates
const ABUJA_CENTER: [number, number] = [9.0579, 7.4951]
const DEFAULT_ZOOM = 11

export default function AbujaMap({
  properties = [],
  selectedProperty,
  className = '',
  interactive = true,
}: AbujaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import for Leaflet (client-side only)
    import('leaflet').then((L) => {
      // Custom grayscale icon
      const customIcon = L.divIcon({
        html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#1a1a1a"/>
          <circle cx="12" cy="12" r="5" fill="#ffffff"/>
        </svg>`,
        className: 'custom-marker',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32],
      })

      // Initialize map with grayscale tiles
      const map = L.map(mapRef.current!, {
        center: selectedProperty
          ? [selectedProperty.latitude, selectedProperty.longitude]
          : ABUJA_CENTER,
        zoom: selectedProperty ? 14 : DEFAULT_ZOOM,
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
      })

      // Use CartoDB Positron for grayscale look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      // Add labels layer on top (also grayscale)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map

      // Add property markers
      if (selectedProperty) {
        const marker = L.marker([selectedProperty.latitude, selectedProperty.longitude], {
          icon: customIcon,
        }).addTo(map)

        marker.bindPopup(`
          <div class="font-sans">
            <p class="font-medium text-sm">${selectedProperty.title}</p>
            <p class="text-xs text-neutral-500">${selectedProperty.district}</p>
          </div>
        `)

        markersRef.current.push(marker)
      } else if (properties.length > 0) {
        properties.forEach((property) => {
          const marker = L.marker([property.latitude, property.longitude], {
            icon: customIcon,
          }).addTo(map)

          marker.bindPopup(`
            <div class="font-sans">
              <p class="font-medium text-sm">${property.title}</p>
              <p class="text-xs text-neutral-500">${property.district}</p>
            </div>
          `)

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
  }, [properties, selectedProperty, interactive])

  return (
    <div
      ref={mapRef}
      className={`w-full h-full min-h-[300px] ${className}`}
      style={{
        filter: 'grayscale(100%) contrast(1.05)',
      }}
    />
  )
}
