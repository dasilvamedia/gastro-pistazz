'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, SlidersHorizontal, LayoutList, Map, X, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, RestaurantType } from '@/types'
import { RESTAURANT_TYPE_LABELS } from '@/types'
import { MOCK_RESTAURANTS, IS_MOCK_MODE } from '@/lib/mock-data'

type ViewMode = 'karte' | 'liste'
type FilterType = RestaurantType | 'alle'
type SortType = 'beliebtheit' | 'neu' | 'rating'

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'cafe', label: 'Café' },
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'biergarten', label: 'Biergarten' },
  { value: 'eisdiele', label: 'Eisdiele' },
]

const sortOptions: { value: SortType; label: string }[] = [
  { value: 'beliebtheit', label: 'Beliebtheit' },
  { value: 'neu', label: 'Neu' },
  { value: 'rating', label: 'Rating' },
]

const GERMAN_CITIES: Record<string, [number, number]> = {
  'Aachen':        [50.7753, 6.0839],
  'Augsburg':      [48.3705, 10.8978],
  'Berlin':        [52.5200, 13.4050],
  'Bielefeld':     [52.0210, 8.5335],
  'Bochum':        [51.4818, 7.2162],
  'Bonn':          [50.7374, 7.0982],
  'Bremen':        [53.0793, 8.8017],
  'Chemnitz':      [50.8278, 12.9214],
  'Dortmund':      [51.5136, 7.4653],
  'Dresden':       [51.0504, 13.7373],
  'Duisburg':      [51.4344, 6.7623],
  'Düsseldorf':    [51.2217, 6.7762],
  'Erfurt':        [50.9848, 11.0299],
  'Essen':         [51.4556, 7.0116],
  'Frankfurt':     [50.1109, 8.6821],
  'Freiburg':      [47.9990, 7.8421],
  'Gelsenkirchen': [51.5177, 7.0857],
  'Hamburg':       [53.5753, 10.0153],
  'Hannover':      [52.3759, 9.7320],
  'Heidenheim':    [48.6775, 10.1534],
  'Karlsruhe':     [49.0069, 8.4037],
  'Kiel':          [54.3233, 10.1228],
  'Köln':          [50.9333, 6.9500],
  'Leipzig':       [51.3397, 12.3731],
  'Lübeck':        [53.8655, 10.6866],
  'Magdeburg':     [52.1317, 11.6392],
  'Mainz':         [49.9929, 8.2473],
  'Mannheim':      [49.4875, 8.4660],
  'München':       [48.1351, 11.5820],
  'Münster':       [51.9607, 7.6261],
  'Nürnberg':      [49.4521, 11.0767],
  'Rostock':       [54.0924, 12.0991],
  'Saarbrücken':   [49.2354, 6.9969],
  'Stuttgart':     [48.7758, 9.1829],
  'Ulm':           [48.3974, 9.9934],
  'Wiesbaden':     [50.0782, 8.2398],
  'Wuppertal':     [51.2562, 7.1508],
}

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
  onSelectRef: React.MutableRefObject<(r: Restaurant) => void>
) {
  layer.clearLayers()
  const withCoords = restaurants.filter(r => r.latitude && r.longitude)
  withCoords.forEach(r => {
    const m = L.marker([r.latitude!, r.longitude!], { icon: createPinIcon(L, r.id) })
    m.on('click', () => onSelectRef.current(r))
    m.addTo(layer)
  })
  if (withCoords.length > 1) {
    const bounds = L.latLngBounds(withCoords.map(r => [r.latitude!, r.longitude!] as [number, number]))
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
  } else if (withCoords.length === 0) {
    const isAll = city === 'alle'
    const coords: [number, number] = isAll ? [51.1657, 10.4515] : (GERMAN_CITIES[city] ?? [48.7758, 9.1829])
    L.marker(coords, { icon: createPinIcon(L, 'demo') }).addTo(layer)
  }
}

// ── Google stars component ────────────────────────────────────────────────────

function GoogleStars({ rating, count }: { rating: number; count?: number | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ fontSize: '0.7rem', color: i < Math.round(rating) ? '#FBBC04' : '#d1d5db' }}>★</span>
      ))}
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1C1F1A', marginLeft: 2 }}>{rating.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>
      )}
    </div>
  )
}

// ── List card ────────────────────────────────────────────────────────────────

function RestaurantListCard({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const now = new Date()
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const hours = restaurant.opening_hours?.[dayKeys[now.getDay()]]
  const isOpen = hours && !hours.closed
  const hasGoogle = restaurant.google_rating != null && restaurant.google_rating > 0

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/restaurant/${restaurant.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#EEF5E6] cursor-pointer"
    >
      <div className="w-full h-40 relative">
        {restaurant.cover_url ? (
          <img src={restaurant.cover_url} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: restaurant.primary_color ? `linear-gradient(135deg, ${restaurant.primary_color}aa, ${restaurant.primary_color})` : 'linear-gradient(135deg, #8BB06A, #577A3D)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow" style={{ fontFamily: 'DM Serif Display, serif' }}>{restaurant.name}</h3>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', background: 'rgba(0,0,0,0.25)', padding: '1px 8px', borderRadius: 99 }}>{RESTAURANT_TYPE_LABELS[restaurant.type]}</span>
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: isOpen ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.85)', color: '#fff' }}>
            {isOpen ? 'Geöffnet' : 'Geschlossen'}
          </span>
        </div>
        {restaurant.logo_url && (
          <div style={{ position: 'absolute', top: 10, left: 10, width: 36, height: 36, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <img src={restaurant.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-[#6D9450] text-xs truncate">{[restaurant.address, restaurant.city].filter(Boolean).join(', ')}</p>
          {hasGoogle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              <GoogleStars rating={restaurant.google_rating!} count={restaurant.google_review_count} />
            </div>
          ) : restaurant.avg_rating > 0 ? (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1C1F1A', flexShrink: 0, marginLeft: 8 }}>⭐ {restaurant.avg_rating.toFixed(1)}</span>
          ) : null}
        </div>
        <p className="text-[#8BB06A] text-xs font-medium mt-1">📸 {restaurant.points_per_story}P für Story</p>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#EEF5E6]">
      <div className="skeleton h-36 w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}

// ── Leaflet map component ────────────────────────────────────────────────────

function LeafletMap({
  city,
  restaurants,
  onSelect,
}: {
  city: string
  restaurants: Restaurant[]
  onSelect: (r: Restaurant) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const locationLayerRef = useRef<any>(null)

  // Stable refs — updated every render, never invalidate effects
  const onSelectRef = useRef(onSelect)
  const restaurantsRef = useRef(restaurants)
  const cityRef = useRef(city)
  onSelectRef.current = onSelect
  restaurantsRef.current = restaurants
  cityRef.current = city

  // ── Effect 1: City change → full map reinit ──────────────────────────────
  useEffect(() => {
    let mounted = true

    async function init() {
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const L = (await import('leaflet')).default
      if (!mounted || !containerRef.current) return

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markersLayerRef.current = null

      const isAll = cityRef.current === 'alle'
      const coords: [number, number] = isAll ? [51.1657, 10.4515] : (GERMAN_CITIES[cityRef.current] ?? [48.7758, 9.1829])
      const zoom = isAll ? 6 : 13
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(coords, zoom)
      mapRef.current = map

      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=de&gl=DE', {
        maxZoom: 20,
        attribution: '',
      }).addTo(map)

      const layer = L.layerGroup().addTo(map)
      markersLayerRef.current = layer

      // Place markers using the freshest restaurant data available
      placeMapMarkers(L, layer, map, restaurantsRef.current, cityRef.current, onSelectRef)
    }

    init()
    return () => {
      mounted = false
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markersLayerRef.current = null
    }
  }, [city]) // Only city — no restaurant dependency → no flicker on data refresh

  // ── Effect 2: Restaurants change → update markers only, no map destroy ───
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return
    ;(async () => {
      const L = (await import('leaflet')).default
      if (!markersLayerRef.current || !mapRef.current) return
      placeMapMarkers(L, markersLayerRef.current, mapRef.current, restaurants, cityRef.current, onSelectRef)
    })()
  }, [restaurants])

  // ── Location button ───────────────────────────────────────────────────────
  const handleLocate = async () => {
    if (!mapRef.current) return
    const L = (await import('leaflet')).default
    navigator.geolocation.getCurrentPosition(
      pos => {
        const currentMap = mapRef.current // always fresh — read inside callback
        if (!currentMap) return
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        if (locationLayerRef.current) { locationLayerRef.current.remove(); locationLayerRef.current = null }
        const group = L.layerGroup()
        L.circle([lat, lng], { radius: accuracy, color: '#4285F4', weight: 1, fillColor: '#4285F4', fillOpacity: 0.08 }).addTo(group)
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:18px;height:18px;background:#4285F4;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(66,133,244,0.5)"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          zIndexOffset: 2000,
        }).addTo(group)
        group.addTo(currentMap)
        locationLayerRef.current = group
        currentMap.setView([lat, lng], 15)
      },
      () => {},
      { enableHighAccuracy: true }
    )
  }

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />

      {/* Google Maps logo */}
      <div style={{ position: 'absolute', bottom: 140, left: 12, zIndex: 900, pointerEvents: 'none' }}>
        <img src="https://maps.gstatic.com/mapfiles/api-3/images/google4.png" style={{ height: 18 }} alt="Google" />
      </div>

      {/* Location button */}
      <button
        onClick={handleLocate}
        style={{
          position: 'absolute',
          bottom: 148,
          right: 16,
          zIndex: 900,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'white',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="#4285F4"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="9" stroke="#4285F4" strokeWidth="1.5" fill="none"/>
        </svg>
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function EntdeckenPage() {
  const supabase = createClient()
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('alle')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const handlePinSelect = useCallback((r: Restaurant) => setSelectedRestaurant(r), [])
  const [sort, setSort] = useState<SortType>('beliebtheit')
  const [showSort, setShowSort] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('karte')
  const [selectedCity, setSelectedCity] = useState<string>('alle')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    if (IS_MOCK_MODE) {
      let filtered = MOCK_RESTAURANTS
      if (filter !== 'alle') filtered = filtered.filter(r => r.type === filter)
      if (search) filtered = filtered.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
      setRestaurants(filtered)
      setLoading(false)
      return
    }
    try {
      let query = supabase.from('restaurants').select('*').eq('is_active', true)
      if (filter !== 'alle') query = query.eq('type', filter)
      if (selectedCity !== 'alle') query = query.eq('city', selectedCity)
      if (search) query = query.ilike('name', `%${search}%`)
      if (sort === 'rating') query = query.order('avg_rating', { ascending: false })
      else if (sort === 'neu') query = query.order('created_at', { ascending: false })
      else query = query.order('total_customers', { ascending: false })
      const { data, error } = await query.limit(50)
      if (error) throw error
      const list = data ?? []
      setRestaurants(list)
      if (selectedCity === 'alle') {
        const cities = [...new Set(list.map(r => r.city).filter(Boolean) as string[])].sort()
        setAvailableCities(cities)
      }
    } catch {
      toast.error('Fehler beim Laden der Restaurants')
    } finally {
      setLoading(false)
    }
  }, [filter, sort, search, selectedCity])

  // Populate available cities on first load
  useEffect(() => {
    if (IS_MOCK_MODE) return
    supabase.from('restaurants').select('city').eq('is_active', true).then(({ data }) => {
      if (data) {
        const cities = [...new Set(data.map(r => r.city).filter(Boolean) as string[])].sort()
        setAvailableCities(cities)
      }
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchRestaurants, 300)
    return () => clearTimeout(t)
  }, [fetchRestaurants])

  // Realtime + polling (fetchRef prevents stale closure in subscription)
  const fetchRef = useRef(fetchRestaurants)
  useEffect(() => { fetchRef.current = fetchRestaurants }, [fetchRestaurants])

  useEffect(() => {
    if (IS_MOCK_MODE) return

    const channel = supabase
      .channel('entdecken-live')
      .on('broadcast', { event: 'restaurant_updated' }, () => fetchRef.current())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants' }, () => fetchRef.current())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restaurants' }, () => fetchRef.current())
      .subscribe()

    // 5s polling fallback — fast enough to feel live without DB pub/sub config
    const poll = setInterval(() => fetchRef.current(), 5_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, []) // subscribe once only

  return (
    <div className="fixed inset-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* ── KARTE ── */}
      <AnimatePresence mode="wait">
        {viewMode === 'karte' ? (
          <motion.div
            key="karte"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <LeafletMap city={selectedCity} restaurants={restaurants} onSelect={handlePinSelect} />

            {/* Top floating header */}
            <div className="absolute top-0 inset-x-0 z-[1000] px-4 pt-12 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCityPicker(v => !v)}
                  className="flex-1 flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-full px-4 py-3 shadow-lg border border-white/60"
                >
                  <MapPin size={14} className="text-[#6D9450] shrink-0" />
                  <span className="flex-1 text-left text-sm font-semibold text-[#1C1F1A]">
                    {selectedCity === 'alle' ? 'Alle Restaurants' : selectedCity}
                  </span>
                  <ChevronDown size={16} className="text-[#6D9450] shrink-0" />
                </button>
                <button className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-xl shadow-lg border border-white/60 flex items-center justify-center">
                  <Search size={18} className="text-[#6D9450]" />
                </button>
              </div>

              <AnimatePresence>
                {showCityPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 overflow-hidden"
                    style={{ maxHeight: '60vh', overflowY: 'auto' }}
                  >
                    <button
                      onClick={() => { setSelectedCity('alle'); setShowCityPicker(false) }}
                      className={`w-full text-left px-5 py-3.5 text-sm border-b border-[#EEF5E6] flex items-center gap-2 transition-colors ${
                        selectedCity === 'alle' ? 'text-[#6D9450] font-semibold bg-[#EEF5E6]/60' : 'text-[#1C1F1A]'
                      }`}
                    >
                      <span className="text-base">🗺️</span>
                      Alle Restaurants
                    </button>
                    {availableCities.map(city => (
                      <button
                        key={city}
                        onClick={() => { setSelectedCity(city); setShowCityPicker(false) }}
                        className={`w-full text-left px-5 py-3.5 text-sm border-b border-[#EEF5E6] last:border-0 flex items-center gap-2 transition-colors ${
                          city === selectedCity ? 'text-[#6D9450] font-semibold bg-[#EEF5E6]/60' : 'text-[#1C1F1A]'
                        }`}
                      >
                        <MapPin size={13} className="text-[#8BB06A] shrink-0" />
                        {city}
                      </button>
                    ))}
                    {availableCities.length === 0 && (
                      <p className="px-5 py-4 text-sm text-gray-400">Lade Städte…</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          /* ── LISTE ── */
          <motion.div
            key="liste"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#EEF5E6] overflow-y-auto pb-32"
          >
            <div className="sticky top-0 z-10 bg-[#EEF5E6] pt-12 pb-3 px-5 space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#1C1F1A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
                  Entdecken
                </h1>
                <div className="relative">
                  <button
                    onClick={() => setShowSort(v => !v)}
                    className="flex items-center gap-1 bg-white border border-[#D4E8C2] rounded-full px-3 py-1.5 text-sm text-[#6D9450] font-medium"
                  >
                    {sortOptions.find(s => s.value === sort)?.label}
                    <ChevronDown size={14} />
                  </button>
                  {showSort && (
                    <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-xl border border-[#EEF5E6] overflow-hidden z-20 w-40">
                      {sortOptions.map(o => (
                        <button
                          key={o.value}
                          onClick={() => { setSort(o.value); setShowSort(false) }}
                          className={`w-full text-left px-4 py-3 text-sm ${sort === o.value ? 'text-[#6D9450] font-bold bg-[#EEF5E6]' : 'text-[#1C1F1A]'}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 border border-[#D4E8C2]">
                <Search size={16} className="text-[#8BB06A]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Restaurants suchen..."
                  className="flex-1 bg-transparent text-sm text-[#1C1F1A] outline-none placeholder:text-[#8BB06A]/60"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {filterOptions.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      filter === f.value ? 'gradient-primary text-white shadow-sm' : 'bg-white text-[#6D9450] border border-[#D4E8C2]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 space-y-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : restaurants.length === 0
                ? (
                  <div className="text-center py-16">
                    <p className="text-5xl mb-3">😔</p>
                    <p className="text-[#6D9450] font-medium">Keine Restaurants gefunden</p>
                  </div>
                )
                : restaurants.map(r => <RestaurantListCard key={r.id} restaurant={r} />)
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating glass pill ── */}
      <div
        className="absolute inset-x-0 flex justify-center z-[1001] pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
      >
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto flex items-center bg-white/70 backdrop-blur-2xl rounded-full px-1.5 py-1.5 gap-0.5"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.8) inset', border: '1px solid rgba(255,255,255,0.75)' }}
        >
          <button
            onClick={() => setShowFilter(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#1C1F1A] transition-all active:scale-95"
            style={{ background: showFilter ? 'rgba(139,176,106,0.18)' : 'transparent' }}
          >
            <SlidersHorizontal size={14} className="text-[#6D9450]" />
            Filter
          </button>

          <div className="w-px h-5 bg-black/10 mx-0.5" />

          <button
            onClick={() => setViewMode(v => v === 'karte' ? 'liste' : 'karte')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#1C1F1A] transition-all active:scale-95"
            style={{ background: viewMode === 'liste' ? 'rgba(139,176,106,0.18)' : 'transparent' }}
          >
            {viewMode === 'karte'
              ? <><LayoutList size={14} className="text-[#6D9450]" />Liste</>
              : <><Map size={14} className="text-[#6D9450]" />Karte</>
            }
          </button>
        </motion.div>
      </div>

      {/* ── Restaurant preview card (pin click) ── */}
      <AnimatePresence>
        {selectedRestaurant && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={() => router.push(`/restaurant/${selectedRestaurant.id}`)}
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 'calc(env(safe-area-inset-bottom) + 90px)',
              zIndex: 1003,
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              cursor: 'pointer',
              // No overflow:hidden here — that was clipping the X button into an oval shape
            }}
          >
            {/* Thumbnail — overflow:hidden only on this inner div */}
            <div style={{ width: 86, height: 86, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              {selectedRestaurant.cover_url ? (
                <img src={selectedRestaurant.cover_url} alt={selectedRestaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: selectedRestaurant.primary_color ? `linear-gradient(135deg,${selectedRestaurant.primary_color}aa,${selectedRestaurant.primary_color})` : 'linear-gradient(135deg,#8BB06A,#577A3D)' }} />
              )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1C1F1A', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 36 }}>
                {selectedRestaurant.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {selectedRestaurant.google_rating && selectedRestaurant.google_rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1C1F1A' }}>{selectedRestaurant.google_rating.toFixed(1)}</span>
                    {selectedRestaurant.google_review_count != null && selectedRestaurant.google_review_count > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>({selectedRestaurant.google_review_count >= 1000 ? `${(selectedRestaurant.google_review_count / 1000).toFixed(1)}k` : selectedRestaurant.google_review_count})</span>
                    )}
                  </div>
                )}
                <span style={{ fontSize: '0.72rem', color: '#374151', background: '#F3F4F6', borderRadius: 99, padding: '2px 8px', fontWeight: 500 }}>
                  {RESTAURANT_TYPE_LABELS[selectedRestaurant.type]}
                </span>
                {selectedRestaurant.city && (
                  <span style={{ fontSize: '0.72rem', color: '#374151', background: '#F3F4F6', borderRadius: 99, padding: '2px 8px', fontWeight: 500 }}>
                    {selectedRestaurant.city}
                  </span>
                )}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EEF5E6', borderRadius: 99, padding: '3px 10px' }}>
                <span style={{ fontSize: '0.72rem' }}>📸</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3D7A22' }}>{selectedRestaurant.points_per_story}P für Story</span>
              </div>
            </div>

            {/* Close button — perfectly round, not clipped */}
            <button
              onClick={e => { e.stopPropagation(); setSelectedRestaurant(null) }}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 28,
                height: 28,
                minWidth: 28,
                minHeight: 28,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <X size={14} strokeWidth={2.5} color="#374151" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter bottom sheet ── */}
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 z-[1002]"
              onClick={() => setShowFilter(false)}
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 z-[1003] bg-white/95 backdrop-blur-2xl rounded-t-3xl px-5 pt-3"
              style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.6)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
            >
              <div className="w-10 h-1 rounded-full bg-black/10 mx-auto mb-5" />
              <h3 className="text-base font-semibold text-[#1C1F1A] mb-4">Filtern nach Typ</h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setFilter(f.value); setShowFilter(false) }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      filter === f.value ? 'gradient-primary text-white shadow-sm' : 'bg-[#EEF5E6] text-[#6D9450]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
