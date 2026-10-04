'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

function hasValidCoordinates(property: Property | undefined): property is Property {
  if (!property) return false
  const latitude = Number(property.latitude)
  const longitude = Number(property.longitude)
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function getCoordinates(property: Pick<Property, 'latitude' | 'longitude'>): [number, number] {
  return [Number(property.latitude), Number(property.longitude)]
}

function escapeHtml(value: string | undefined) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function propertyImageMarkup(property: Property) {
  const image = property.images?.[0]
  if (!image) return ''

  return `
    <div style="width: 100%; height: 96px; margin-bottom: 10px; border-radius: 10px; overflow: hidden; background: #f3f4f6;">
      <img
        src="${escapeHtml(image)}"
        alt="${escapeHtml(property.title)}"
        loading="lazy"
        style="width: 100%; height: 100%; object-fit: cover; display: block;"
      />
    </div>
  `
}

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
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const mappableProperties = useMemo(() => (
    selectedProperty
      ? hasValidCoordinates(selectedProperty) ? [selectedProperty] : []
      : properties.filter(hasValidCoordinates)
  ), [properties, selectedProperty])
  const hasMapPins = mappableProperties.length > 0

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let cancelled = false

    // Dynamic import for Leaflet (client-side only)
    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return
      // Sticker-style pins matching the site's icon set: gradient body, white rim, soft shadow
      const PIN = 'M13.6177 21.367C13.1841 21.773 12.6044 22 12.0011 22C11.3978 22 10.8182 21.773 10.3845 21.367C6.41302 17.626 1.09076 13.4469 3.68627 7.37966C5.08963 4.09916 8.45834 2 12.0011 2C15.5439 2 18.9126 4.09916 20.316 7.37966C22.9082 13.4393 17.599 17.6389 13.6177 21.367Z'
      const HOUSE = 'M8.6 11.4 12 8.6l3.4 2.8V15a.8.8 0 0 1-.8.8H9.4a.8.8 0 0 1-.8-.8z'
      const LAND = 'M8.4 9.6h7.2v6H8.4zM12 9.6v6M8.4 12.6h7.2'
      const pin = (id: string, from: string, to: string, glyph: string, fillGlyph: boolean) => L.divIcon({
        html: `<svg viewBox="-3 -3 30 30" width="44" height="44" style="overflow:visible;filter:drop-shadow(0 1px 1px rgb(16 24 40/.2)) drop-shadow(0 5px 7px rgb(16 24 40/.18))">
          <defs><linearGradient id="${id}g" x1=".25" y1="0" x2=".75" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
          <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
          <path d="${PIN}" fill="#fff" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/>
          <path d="${PIN}" fill="url(#${id}g)"/><path d="${PIN}" fill="url(#${id}h)"/>
          <path d="${glyph}" fill="${fillGlyph ? '#fff' : 'none'}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>`,
        className: 'sticker-pin',
        iconSize: [44, 44],
        iconAnchor: [22, 40],
        popupAnchor: [0, -38],
      })
      const houseIcon = pin('pinH', '#5AA9FF', '#0047E0', HOUSE, true)
      const landIcon = pin('pinL', '#4BE8A6', '#00A35F', LAND, false)

      // Initialize map
      const map = L.map(mapRef.current!, {
        center: selectedProperty && hasValidCoordinates(selectedProperty)
          ? getCoordinates(selectedProperty)
          : ABUJA_CENTER,
        zoom: selectedProperty ? 14 : fullPage ? 12 : DEFAULT_ZOOM,
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
      })

      // CARTO Voyager: cleaner, more colourful than default OSM tiles (no API key needed).
      // Saturation is lifted further in CSS (.leaflet-tile-pane in globals.css).
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)
      if (window.matchMedia('(max-width: 639px)').matches && interactive) map.zoomControl.setPosition('bottomright')

      mapInstanceRef.current = map
      setIsLoaded(true)

      const invalidateSize = () => {
        window.requestAnimationFrame(() => map.invalidateSize())
      }
      invalidateSize()
      window.setTimeout(invalidateSize, 150)
      window.setTimeout(invalidateSize, 500)

      if ('ResizeObserver' in window && mapRef.current) {
        resizeObserverRef.current = new ResizeObserver(invalidateSize)
        resizeObserverRef.current.observe(mapRef.current)
      }

      // Add property markers
      if (selectedProperty && hasValidCoordinates(selectedProperty)) {
        const icon = selectedProperty.type === 'land' ? landIcon : houseIcon
        const marker = L.marker(getCoordinates(selectedProperty), {
          icon,
        }).addTo(map)

        if (showPopups) {
          marker.bindPopup(`
            <div style="font-family: system-ui, sans-serif; min-width: 220px;">
              ${propertyImageMarkup(selectedProperty)}
              <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0; color: var(--color-ink);">${escapeHtml(selectedProperty.title)}</p>
              <p style="font-size: 12px; color: #666; margin: 0;">${escapeHtml(selectedProperty.district)}</p>
            </div>
          `, { maxWidth: 280 })
        }

        markersRef.current.push(marker)
      } else if (mappableProperties.length > 0) {
        mappableProperties.forEach((property) => {
          const icon = property.type === 'land' ? landIcon : houseIcon
          const marker = L.marker(getCoordinates(property), {
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
                ${propertyImageMarkup(property)}
                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                  <span style="background: ${property.type === 'land' ? '#059669' : 'var(--color-brand)'}; color: white; font-size: 10px; padding: 2px 6px; text-transform: uppercase; font-weight: 500;">${typeLabel}</span>
                  ${property.featured ? '<span style="background: #f59e0b; color: white; font-size: 10px; padding: 2px 6px; text-transform: uppercase; font-weight: 500;">Featured</span>' : ''}
                </div>
                <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0; color: var(--color-ink);">${escapeHtml(property.title)}</p>
                <p style="font-size: 12px; color: #666; margin: 0 0 8px 0;">${escapeHtml(property.address)}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #eee;">
                  <span style="font-weight: 600; color: var(--color-brand); font-size: 14px;">${formatPrice(property.price)}</span>
                  ${details ? `<span style="font-size: 12px; color: #666;">${escapeHtml(details)}</span>` : ''}
                </div>
                <a href="/properties/${encodeURIComponent(property.id)}" style="display: block; text-align: center; margin-top: 10px; padding: 8px; background: var(--color-brand); color: white; text-decoration: none; font-size: 12px; font-weight: 500;">View Property</a>
              </div>
            `, { maxWidth: 280 })
          }

          markersRef.current.push(marker)
        })

        // Fit bounds to show all markers
        if (mappableProperties.length > 1) {
          const bounds = L.latLngBounds(
            mappableProperties.map(getCoordinates)
          )
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      }
    })

    return () => {
      cancelled = true
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      markersRef.current = []
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      setIsLoaded(false)
    }
  }, [properties, selectedProperty, interactive, showPopups, fullPage, mappableProperties])

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
      {isLoaded && !hasMapPins && (
        <div className="absolute inset-0 z-[500] bg-white/85 flex items-center justify-center p-6 text-center">
          <div>
            <p className="font-medium text-ink">No mappable properties yet</p>
            <p className="mt-1 text-sm text-neutral-500">Add valid latitude and longitude values to show pins here.</p>
          </div>
        </div>
      )}
    </div>
  )
}
