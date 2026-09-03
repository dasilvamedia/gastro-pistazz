'use client'

import { useEffect, useRef, useState } from 'react'
import type { Restaurant } from '@/types'
import type { LatLng } from '@/lib/geo'
import { GERMANY_CENTER, cityCenter } from './cities'

// ── Module-level map helpers (no React deps) ─────────────────────────────────

function createPinIcon(L: any, id: string) {
  return L.divIcon({
    className: '',
    html: `<div style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.28))">
      <svg width="48" height="60" viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="clip-${id}">
            <circle cx="24" cy="22" r="18"/>
          </clipPath>
        </defs>
        <path d="M24 0C10.7 0 0 10.7 0 24C0 37.3 24 60 24 60C24 60 48 37.3 48 24C48 10.7 37.3 0 24 0Z" fill="white"/>
        <circle cx="24" cy="22" r="18" fill="#f0f8ec"/>
        <image href="/marker-pistazz.png" x="6" y="4" width="36" height="36" clip-path="url(#clip-${id})"/>
        <circle cx="24" cy="22" r="18" fill="none" stroke="#8BB06A" stroke-width="1.5"/>
      </svg>
    </div>`,
    iconSize: [48, 60],
    iconAnchor: [24, 60],
    popupAnchor: [0, -62],
  })
}

function placeMapMarkers(
  L: any,
  layer: any,
  map: any,
  restaurants: Restaurant[],
  city: string,
  onSelectRef: React.MutableRefObject<(r: Restaurant) => void>,
  shouldFit: boolean = true, // fitBounds nur bei Stadt-/Erst-Render, nicht bei jedem Datenrefresh (verhindert Freeze)
) {
  layer.clearLayers()
  const withCoords = restaurants.filter(r => r.latitude && r.longitude)
  withCoords.forEach(r => {
    const m = L.marker([r.latitude!, r.longitude!], { icon: createPinIcon(L, r.id) })
    m.on('click', () => onSelectRef.current(r))
    m.addTo(layer)
  })
  if (!shouldFit) return
  if (withCoords.length > 1) {
    const bounds = L.latLngBounds(withCoords.map(r => [r.latitude!, r.longitude!] as [number, number]))
    // animate:false: kein Animations-Loop, der den Main-Thread blockiert
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: false })
  } else if (withCoords.length === 0) {
    const coords: [number, number] = city === 'alle' ? GERMANY_CENTER : cityCenter(city)
    L.marker(coords, { icon: createPinIcon(L, 'demo') }).addTo(layer)
  }
}

// ── Leaflet map component ────────────────────────────────────────────────────

export function LeafletMap({
  viewKey,
  city,
  restaurants,
  onSelect,
  userPos,
  radiusKm,
  onLocate,
}: {
  /** Aendert sich bei Stadtwechsel oder Umkreis an/aus -> Karte neu aufbauen */
  viewKey: string
  city: string
  restaurants: Restaurant[]
  onSelect: (r: Restaurant) => void
  userPos: LatLng | null
  radiusKm: number
  /** Locate-Button: aktiviert den Umkreis-Modus in der Seite */
  onLocate: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const radiusLayerRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const cleanupTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const resizeObsRef = useRef<ResizeObserver | null>(null)

  // Stable refs: updated every render, never invalidate effects
  const onSelectRef = useRef(onSelect)
  const restaurantsRef = useRef(restaurants)
  const cityRef = useRef(city)
  const userPosRef = useRef(userPos)
  onSelectRef.current = onSelect
  restaurantsRef.current = restaurants
  cityRef.current = city
  userPosRef.current = userPos

  // ── Effect 1: viewKey change -> full map reinit ──────────────────────────
  useEffect(() => {
    let mounted = true

    async function init() {
      const L = (await import('leaflet')).default
      if (!mounted || !containerRef.current) return

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markersLayerRef.current = null
      radiusLayerRef.current = null

      const nearby = !!userPosRef.current
      const isAll = cityRef.current === 'alle'
      const coords: [number, number] = nearby
        ? [userPosRef.current!.lat, userPosRef.current!.lng]
        : isAll ? GERMANY_CENTER : cityCenter(cityRef.current)
      const zoom = nearby ? 12 : isAll ? 6 : 13
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false, fadeAnimation: true }).setView(coords, zoom)
      mapRef.current = map

      const tiles = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=de&gl=DE', {
        maxZoom: 20,
        attribution: '',
      }).addTo(map)
      // Karte erst zeigen, wenn Tiles UND Layout-Settle durch sind,
      // vorher deckt ein weicher Vorhang das Marker-/Tile-Geflacker ab
      setMapReady(false)
      let tilesDone = false, settleDone = false
      const maybeReady = () => { if (tilesDone && settleDone) setMapReady(true) }
      tiles.once('load', () => { tilesDone = true; maybeReady() })
      setTimeout(() => { settleDone = true; maybeReady() }, 1300)
      setTimeout(() => setMapReady(true), 3500)

      const layer = L.layerGroup().addTo(map)
      markersLayerRef.current = layer

      // Erst-Render: Marker setzen; im Umkreis-Modus passt Effekt 3 den Kreis ein
      placeMapMarkers(L, layer, map, restaurantsRef.current, cityRef.current, onSelectRef, !nearby)

      // ── KRITISCH (Mobile-Fix): Container hat beim Init oft noch nicht die finale Groesse
      // (AnimatePresence/Layout) -> Leaflet rendert nur ein kleines Tile-Quadrat.
      const refit = () => {
        if (!mapRef.current || !markersLayerRef.current) return
        mapRef.current.invalidateSize({ animate: false })
        if (!userPosRef.current) {
          placeMapMarkers(L, markersLayerRef.current, mapRef.current, restaurantsRef.current, cityRef.current, onSelectRef, true)
        }
      }
      requestAnimationFrame(() => { mapRef.current?.invalidateSize({ animate: false }) })
      const t1 = setTimeout(refit, 350)
      const t2 = setTimeout(refit, 1200)
      cleanupTimersRef.current = [t1, t2]

      if (containerRef.current && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          mapRef.current?.invalidateSize({ animate: false })
        })
        ro.observe(containerRef.current)
        resizeObsRef.current = ro
      }
    }

    init()
    return () => {
      mounted = false
      cleanupTimersRef.current.forEach(clearTimeout)
      cleanupTimersRef.current = []
      resizeObsRef.current?.disconnect()
      resizeObsRef.current = null
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markersLayerRef.current = null
      radiusLayerRef.current = null
    }
  }, [viewKey])

  // ── Effect 2: Restaurants change -> NUR Marker updaten, KEIN fitBounds ────
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return
    ;(async () => {
      const L = (await import('leaflet')).default
      if (!markersLayerRef.current || !mapRef.current) return
      placeMapMarkers(L, markersLayerRef.current, mapRef.current, restaurants, cityRef.current, onSelectRef, false)
    })()
  }, [restaurants])

  // ── Effect 3: Standort / Umkreis -> Kreis + Punkt zeichnen und einpassen ──
  useEffect(() => {
    ;(async () => {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default
      const map = mapRef.current
      if (!map) return
      if (radiusLayerRef.current) { radiusLayerRef.current.remove(); radiusLayerRef.current = null }
      if (!userPos) return

      const group = L.layerGroup()
      const circle = L.circle([userPos.lat, userPos.lng], {
        radius: radiusKm * 1000, color: '#8BB06A', weight: 2, fillColor: '#8BB06A', fillOpacity: 0.08,
      }).addTo(group)
      L.marker([userPos.lat, userPos.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:18px;height:18px;background:#4285F4;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(66,133,244,0.5)"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        zIndexOffset: 2000,
      }).addTo(group)
      group.addTo(map)
      radiusLayerRef.current = group
      map.fitBounds(circle.getBounds(), { padding: [24, 24], animate: false })
    })()
  }, [userPos, radiusKm, viewKey])

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {/* Weicher Vorhang beim Kartenaufbau: kein Tile-/Marker-Geflacker */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{
          zIndex: 950,
          background: '#E8EDE3',
          opacity: mapReady ? 0 : 1,
          transition: 'opacity 0.45s ease',
        }}
      >
        <span className="w-9 h-9 border-[3px] rounded-full animate-spin" style={{ borderColor: 'rgba(139,176,106,0.3)', borderTopColor: '#8BB06A' }} />
      </div>

      {/* Google Maps logo */}
      <div style={{ position: 'absolute', bottom: 140, left: 12, zIndex: 900, pointerEvents: 'none' }}>
        <img src="https://maps.gstatic.com/mapfiles/api-3/images/google4.png" style={{ height: 18 }} alt="Google" />
      </div>

      {/* Location button -> Umkreis-Modus */}
      <button
        onClick={onLocate}
        aria-label="In meiner Naehe"
        style={{
          position: 'absolute',
          bottom: 148,
          right: 16,
          zIndex: 900,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: userPos ? '#8BB06A' : 'white',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill={userPos ? '#fff' : '#4285F4'}/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={userPos ? '#fff' : '#4285F4'} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="9" stroke={userPos ? '#fff' : '#4285F4'} strokeWidth="1.5" fill="none"/>
        </svg>
      </button>
    </div>
  )
}
