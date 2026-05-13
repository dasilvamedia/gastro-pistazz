'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import type { Restaurant } from '@/types'

const DEFAULT_CENTER = { lat: 51.1657, lng: 10.4515 }
const DEFAULT_ZOOM = 6

// ─── Custom pin SVG factory ───────────────────────────────────────────────────

const PIN_ICON_URL = '/pin-icon.png'

function pinSvgUrl(hasDeals: boolean, selected: boolean): string {
  const color = selected ? '#E86B5A' : hasDeals ? '#E5B84C' : '#8BB06A'
  const scale = selected ? 1.25 : 1
  const w = Math.round(36 * scale)
  const h = Math.round(48 * scale)
  // Inner circle for the image: centered at (18,18), radius ~11
  // clipPath to make image circular
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <clipPath id="circle-clip-${selected ? 's' : hasDeals ? 'd' : 'n'}">
        <circle cx="18" cy="18" r="10"/>
      </clipPath>
    </defs>
    <path d="M18 0C8.059 0 0 8.059 0 18c0 12 18 30 18 30S36 30 36 18C36 8.059 27.941 0 18 0z" fill="${color}"/>
    <circle cx="18" cy="18" r="11" fill="white"/>
    <image href="${PIN_ICON_URL}" x="8" y="8" width="20" height="20" clip-path="url(#circle-clip-${selected ? 's' : hasDeals ? 'd' : 'n'})"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// ─── Google Map style (clean, muted — closer to Starbucks/reference look) ────

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e8f5e9' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b2dfdb' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fff9c4' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#fafafa' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
]

// ─── MapView ──────────────────────────────────────────────────────────────────

interface MapViewProps {
  restaurants: Restaurant[]
  selectedRestaurant: Restaurant | null
  onSelectRestaurant: (r: Restaurant | null) => void
  flyToCity: { city: string; coords: [number, number] } | null
  locateTrigger: number
}

export default function MapView({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  flyToCity,
  locateTrigger,
}: MapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const prevFlyRef = useRef<string | null>(null)
  const prevLocateRef = useRef(0)
  const [mapReady, setMapReady] = useState(false)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    id: 'google-map-script',
  })

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    map.setOptions({ styles: MAP_STYLES })
    setMapReady(true)
  }, [])

  // Update markers when restaurants or selection changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const mappable = restaurants.filter(r => r.latitude != null && r.longitude != null)

    mappable.forEach(r => {
      const hasDeals = r.points_per_story > 300
      const isSelected = selectedRestaurant?.id === r.id
      const iconUrl = pinSvgUrl(hasDeals, isSelected)
      const scale = isSelected ? 1.25 : 1
      const w = Math.round(36 * scale)
      const h = Math.round(48 * scale)

      const marker = new google.maps.Marker({
        position: { lat: r.latitude!, lng: r.longitude! },
        map,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(w, h),
          anchor: new google.maps.Point(w / 2, h),
        },
        title: r.name,
        zIndex: isSelected ? 100 : 1,
      })

      marker.addListener('click', () => {
        onSelectRestaurant(isSelected ? null : r)
      })

      markersRef.current.push(marker)
    })
  }, [restaurants, selectedRestaurant, mapReady, onSelectRestaurant])

  // Fly to city
  useEffect(() => {
    if (!flyToCity || !mapReady || !mapRef.current) return
    const key = flyToCity.city
    if (prevFlyRef.current === key) return
    prevFlyRef.current = key
    mapRef.current.panTo({ lat: flyToCity.coords[0], lng: flyToCity.coords[1] })
    mapRef.current.setZoom(13)
  }, [flyToCity, mapReady])

  // Locate me
  useEffect(() => {
    if (locateTrigger === 0 || locateTrigger === prevLocateRef.current) return
    prevLocateRef.current = locateTrigger
    if (!navigator.geolocation || !mapRef.current) return
    navigator.geolocation.getCurrentPosition(pos => {
      mapRef.current!.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      mapRef.current!.setZoom(14)
    })
  }, [locateTrigger])

  if (loadError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF5E6' }}>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Karte konnte nicht geladen werden</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#e8f5e9' }} />
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      onLoad={onMapLoad}
      options={{
        zoomControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        gestureHandling: 'greedy',
        styles: MAP_STYLES,
      }}
      onClick={() => onSelectRestaurant(null)}
    />
  )
}
