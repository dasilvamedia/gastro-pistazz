'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, SlidersHorizontal, LayoutList, Map, X, MapPin, LocateFixed, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/types'
import { RESTAURANT_TYPE_LABELS } from '@/types'
import { MOCK_RESTAURANTS, IS_MOCK_MODE } from '@/lib/mock-data'
import {
  attachDistance, boundingBox, formatDistance, getGeoPermissionState, requestPosition,
  DEFAULT_RADIUS_KM, MAX_RADIUS_KM, type LatLng, type WithDistance,
} from '@/lib/geo'
import { matchTagValues } from '@/lib/restaurantTags'
import { RadiusSlider } from '@/components/ui/RadiusSlider'
import { TagPills } from '@/components/ui/TagPills'
import { LeafletMap } from './LeafletMap'
import { RestaurantListCard, SkeletonCard, GoogleLogo } from './ListCard'
import { FilterSheet, filterOptions, type FilterType } from './FilterSheet'

type ViewMode = 'karte' | 'liste'
type SortType = 'beliebtheit' | 'neu' | 'rating' | 'entfernung'
type GeoState = 'idle' | 'requesting' | 'granted' | 'denied'

const sortOptions: { value: SortType; label: string }[] = [
  { value: 'beliebtheit', label: 'Beliebtheit' },
  { value: 'neu', label: 'Neu' },
  { value: 'rating', label: 'Rating' },
  { value: 'entfernung', label: 'Entfernung' },
]

const RADIUS_KEY = 'pz_radius_km'

function readStoredRadius(): number {
  try {
    const v = Number(localStorage.getItem(RADIUS_KEY))
    return v >= 1 && v <= MAX_RADIUS_KM ? v : DEFAULT_RADIUS_KM
  } catch { return DEFAULT_RADIUS_KM }
}

// PostgREST-or()-Syntax: Kommas und Klammern im Suchbegriff wuerden die
// Filterkette zerbrechen, deshalb raus damit.
function cleanTerm(s: string) {
  return s.replace(/[,()%]/g, ' ').trim()
}

export default function EntdeckenPage() {
  const supabase = createClient()
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('alle')
  const [cuisineFilter, setCuisineFilter] = useState<string[]>([])
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<WithDistance<Restaurant> | null>(null)
  const handlePinSelect = useCallback((r: Restaurant) => setSelectedRestaurant(r), [])
  const [sort, setSort] = useState<SortType>('beliebtheit')
  const [showSort, setShowSort] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('karte')
  const [selectedCity, setSelectedCity] = useState<string>('alle')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  // ── "In meiner Naehe" ──
  const [userPos, setUserPos] = useState<LatLng | null>(null)
  const [nearbyActive, setNearbyActive] = useState(false)
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM)
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const [geoHint, setGeoHint] = useState(false)
  const [showRadius, setShowRadius] = useState(true)

  useEffect(() => { setRadiusKm(readStoredRadius()) }, [])
  const commitRadius = (km: number) => { try { localStorage.setItem(RADIUS_KEY, String(km)) } catch { /* egal */ } }

  const activateNearby = useCallback(async () => {
    setGeoHint(false)
    const perm = await getGeoPermissionState()
    if (perm === 'denied') { setGeoState('denied'); setGeoHint(true); return }
    setGeoState('requesting')
    try {
      const pos = await requestPosition()
      setUserPos(pos)
      setNearbyActive(true)
      setSelectedCity('alle')
      setSort('entfernung')
      setGeoState('granted')
      setShowCityPicker(false)
    } catch (e) {
      if (e === 'denied') { setGeoState('denied'); setGeoHint(true) }
      else { setGeoState('idle'); toast.error('Standort konnte nicht ermittelt werden. Bitte erneut versuchen.') }
    }
  }, [])

  const deactivateNearby = useCallback(() => {
    setNearbyActive(false)
    setGeoHint(false)
    if (sort === 'entfernung') setSort('beliebtheit')
  }, [sort])

  const toggleNearby = () => { if (nearbyActive) deactivateNearby(); else activateNearby() }

  // Deep-Link /entdecken?nah=1 (z.B. vom "Alle"-Button auf /home)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('nah') === '1') activateNearby()
  }, [activateNearby])

  // Hash der letzten Daten: verhindert unnoetige Re-Renders (Map-Marker-Rebuild) bei unveraenderten Daten
  const lastDataHashRef = useRef('')

  const fetchRestaurants = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    if (IS_MOCK_MODE) {
      let filtered = MOCK_RESTAURANTS
      if (filter !== 'alle') filtered = filtered.filter(r => r.type === filter)
      if (search) filtered = filtered.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
      if (cuisineFilter.length) filtered = filtered.filter(r => (r.cuisine ?? []).some(c => cuisineFilter.includes(c)))
      if (dietaryFilter.length) filtered = filtered.filter(r => dietaryFilter.every(d => (r.dietary ?? []).includes(d)))
      setRestaurants(filtered)
      setLoading(false)
      return
    }
    try {
      let query = supabase.from('restaurants').select('*').eq('is_active', true)
      if (filter !== 'alle') query = query.eq('type', filter)
      if (cuisineFilter.length) query = query.overlaps('cuisine', cuisineFilter)
      if (dietaryFilter.length) query = query.contains('dietary', dietaryFilter)

      const term = cleanTerm(search)
      if (term) {
        const tags = matchTagValues(term)
        const parts = [`name.ilike.%${term}%`, `description.ilike.%${term}%`, `city.ilike.%${term}%`]
        for (const c of tags.cuisine) parts.push(`cuisine.cs.{${c}}`)
        for (const d of tags.dietary) parts.push(`dietary.cs.{${d}}`)
        query = query.or(parts.join(','))
      }

      const nearby = nearbyActive && userPos
      if (nearby) {
        // Bounding-Box fuer den maximalen Radius; der Slider filtert danach
        // nur clientseitig, damit Schieben keinen Request ausloest
        const box = boundingBox(userPos.lat, userPos.lng, MAX_RADIUS_KM)
        query = query
          .gte('latitude', box.minLat).lte('latitude', box.maxLat)
          .gte('longitude', box.minLng).lte('longitude', box.maxLng)
      } else if (selectedCity !== 'alle') {
        query = query.eq('city', selectedCity)
      }

      if (sort === 'rating') query = query.order('avg_rating', { ascending: false })
      else if (sort === 'neu') query = query.order('created_at', { ascending: false })
      else query = query.order('total_customers', { ascending: false })

      const { data, error } = await query.limit(nearby ? 200 : 50)
      if (error) throw error
      const list = data ?? []
      const hash = list.map(r => `${r.id}:${r.updated_at ?? ''}:${r.latitude}:${r.longitude}:${r.is_active}`).join('|')
      if (hash !== lastDataHashRef.current) {
        lastDataHashRef.current = hash
        setRestaurants(list)
        if (selectedCity === 'alle' && !nearby) {
          const cities = [...new Set(list.map(r => r.city).filter(Boolean) as string[])].sort()
          setAvailableCities(cities)
        }
      }
    } catch {
      if (!background) toast.error('Fehler beim Laden der Restaurants')
    } finally {
      if (!background) setLoading(false)
    }
  }, [filter, sort, search, selectedCity, cuisineFilter, dietaryFilter, nearbyActive, userPos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Distanz anhaengen, Umkreis anwenden, ggf. nach Entfernung sortieren
  const visible = useMemo<WithDistance<Restaurant>[]>(() => {
    let list: WithDistance<Restaurant>[] = attachDistance(restaurants, userPos)
    if (nearbyActive && userPos) {
      list = list.filter(r => r.distanceKm != null && r.distanceKm <= radiusKm)
    }
    if (sort === 'entfernung' && userPos) {
      list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    }
    return list
  }, [restaurants, userPos, nearbyActive, radiusKm, sort])

  // Populate available cities on first load
  useEffect(() => {
    if (IS_MOCK_MODE) return
    supabase.from('restaurants').select('city').eq('is_active', true).then(({ data }) => {
      if (data) {
        const cities = [...new Set(data.map(r => r.city).filter(Boolean) as string[])].sort()
        setAvailableCities(cities)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchRestaurants, 300)
    return () => clearTimeout(t)
  }, [fetchRestaurants])

  // Live-Refresh: ein Broadcast-Kanal (Server sendet bei Restaurant-Aenderungen),
  // plus 60-s-Polling als Fallback. Kein postgres_changes mehr auf der ganzen
  // Tabelle: das hat bei jedem Owner-Klick jeden verbundenen Gast neu laden lassen.
  const fetchRef = useRef(fetchRestaurants)
  useEffect(() => { fetchRef.current = fetchRestaurants }, [fetchRestaurants])

  useEffect(() => {
    if (IS_MOCK_MODE) return
    const channel = supabase
      .channel('entdecken-live')
      .on('broadcast', { event: 'restaurant_updated' }, () => fetchRef.current(true))
      .subscribe()
    const poll = setInterval(() => fetchRef.current(true), 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchRef.current(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeFilterCount = (filter !== 'alle' ? 1 : 0) + cuisineFilter.length + dietaryFilter.length
  const viewKey = nearbyActive && userPos ? 'nearby' : selectedCity
  const visibleSortOptions = sortOptions.filter(o => o.value !== 'entfernung' || (nearbyActive && userPos))

  const nearbyChip = (
    <button
      onClick={toggleNearby}
      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
        nearbyActive ? 'gradient-primary text-white shadow-sm' : 'bg-white text-[#6D9450] border border-[#D4E8C2]'
      }`}
    >
      {geoState === 'requesting' ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
      In meiner Nähe
    </button>
  )

  const geoHintCard = geoHint && (
    <div className="bg-white rounded-2xl p-4 border border-amber-200 flex gap-3">
      <MapPin size={18} className="text-amber-500 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-[#1C1F1A]">Standortzugriff ist deaktiviert</p>
        <p className="text-[#6D9450] text-xs mt-1">
          Erlaube ihn unter Einstellungen, Pistazz, Standort und tippe danach erneut auf In meiner Nähe. Oder wähle eine Stadt.
        </p>
        <div className="flex gap-2 mt-3">
          <button onClick={() => { setGeoHint(false); setShowCityPicker(true); setViewMode('karte') }} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#EEF5E6] text-[#577A3D]">Stadt wählen</button>
          <button onClick={activateNearby} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1C1F1A] text-white">Erneut versuchen</button>
        </div>
      </div>
    </div>
  )

  const emptyNearby = (
    <div className="text-center py-16">
      <p className="text-5xl mb-3">📍</p>
      <p className="text-[#6D9450] font-medium">Keine Restaurants im Umkreis von {radiusKm} km.</p>
      {radiusKm < MAX_RADIUS_KM && (
        <button
          onClick={() => { const next = Math.min(MAX_RADIUS_KM, radiusKm + 10); setRadiusKm(next); commitRadius(next) }}
          className="mt-4 px-5 py-2.5 rounded-full gradient-primary text-white text-sm font-semibold"
        >
          +10 km
        </button>
      )}
    </div>
  )

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
            <LeafletMap
              viewKey={viewKey}
              city={selectedCity}
              restaurants={visible}
              onSelect={handlePinSelect}
              userPos={nearbyActive ? userPos : null}
              radiusKm={radiusKm}
              onLocate={activateNearby}
            />

            {/* Top floating header */}
            <div className="absolute top-0 inset-x-0 z-[1000] px-4 pt-12 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCityPicker(v => !v)}
                  className="flex-1 flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-full px-4 py-3 shadow-lg border border-white/60"
                >
                  {nearbyActive ? <LocateFixed size={14} className="text-[#6D9450] shrink-0" /> : <MapPin size={14} className="text-[#6D9450] shrink-0" />}
                  <span className="flex-1 text-left text-sm font-semibold text-[#1C1F1A]">
                    {nearbyActive ? `In meiner Nähe, ${radiusKm} km` : selectedCity === 'alle' ? 'Alle Restaurants' : selectedCity}
                  </span>
                  <ChevronDown size={16} className="text-[#6D9450] shrink-0" />
                </button>
                <button onClick={() => setViewMode('liste')} className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-xl shadow-lg border border-white/60 flex items-center justify-center" aria-label="Suchen">
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
                      onClick={() => { activateNearby(); setShowCityPicker(false) }}
                      className={`w-full text-left px-5 py-3.5 text-sm border-b border-[#EEF5E6] flex items-center gap-2 transition-colors ${
                        nearbyActive ? 'text-[#6D9450] font-semibold bg-[#EEF5E6]/60' : 'text-[#1C1F1A]'
                      }`}
                    >
                      <LocateFixed size={14} className="text-[#8BB06A] shrink-0" />
                      In meiner Nähe
                    </button>
                    <button
                      onClick={() => { deactivateNearby(); setSelectedCity('alle'); setShowCityPicker(false) }}
                      className={`w-full text-left px-5 py-3.5 text-sm border-b border-[#EEF5E6] flex items-center gap-2 transition-colors ${
                        !nearbyActive && selectedCity === 'alle' ? 'text-[#6D9450] font-semibold bg-[#EEF5E6]/60' : 'text-[#1C1F1A]'
                      }`}
                    >
                      <span className="text-base">🗺️</span>
                      Alle Restaurants
                    </button>
                    {availableCities.map(city => (
                      <button
                        key={city}
                        onClick={() => { deactivateNearby(); setSelectedCity(city); setShowCityPicker(false) }}
                        className={`w-full text-left px-5 py-3.5 text-sm border-b border-[#EEF5E6] last:border-0 flex items-center gap-2 transition-colors ${
                          !nearbyActive && city === selectedCity ? 'text-[#6D9450] font-semibold bg-[#EEF5E6]/60' : 'text-[#1C1F1A]'
                        }`}
                      >
                        <MapPin size={13} className="text-[#8BB06A] shrink-0" />
                        {city}
                      </button>
                    ))}
                    {availableCities.length === 0 && (
                      <p className="px-5 py-4 text-sm text-gray-400">Lade Städte ...</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Umkreis-Panel auf der Karte */}
              {nearbyActive && userPos && !showCityPicker && (
                <div className="mt-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 px-4 py-2">
                  <button onClick={() => setShowRadius(v => !v)} className="w-full flex items-center justify-between text-xs text-[#6D9450] py-1">
                    <span>{visible.length} Restaurants im Umkreis</span>
                    <ChevronDown size={14} className={`transition-transform ${showRadius ? 'rotate-180' : ''}`} />
                  </button>
                  {showRadius && <RadiusSlider value={radiusKm} onChange={setRadiusKm} onCommit={commitRadius} compact />}
                </div>
              )}
              {geoHint && <div className="mt-2">{geoHintCard}</div>}
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
                      {visibleSortOptions.map(o => (
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
                  placeholder="Restaurant, Stadt oder Küche suchen"
                  className="flex-1 bg-transparent text-sm text-[#1C1F1A] outline-none placeholder:text-[#8BB06A]/60"
                />
                {search && <button onClick={() => setSearch('')} aria-label="Suche leeren"><X size={14} className="text-[#6D9450]" /></button>}
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {nearbyChip}
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

              {nearbyActive && userPos && (
                <div className="bg-white rounded-2xl px-4 py-2 border border-[#D4E8C2]">
                  <RadiusSlider value={radiusKm} onChange={setRadiusKm} onCommit={commitRadius} />
                </div>
              )}
              {geoHintCard}
            </div>

            <div className="px-5 space-y-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : visible.length === 0
                ? (nearbyActive && userPos ? emptyNearby : (
                  <div className="text-center py-16">
                    <p className="text-5xl mb-3">😔</p>
                    <p className="text-[#6D9450] font-medium">Keine Restaurants gefunden</p>
                    {activeFilterCount > 0 && (
                      <button onClick={() => { setFilter('alle'); setCuisineFilter([]); setDietaryFilter([]) }} className="mt-3 text-sm text-[#577A3D] underline">Filter zurücksetzen</button>
                    )}
                  </div>
                ))
                : visible.map(r => <RestaurantListCard key={r.id} restaurant={r} />)
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
            style={{ background: showFilter || activeFilterCount > 0 ? 'rgba(139,176,106,0.18)' : 'transparent' }}
          >
            <SlidersHorizontal size={14} className="text-[#6D9450]" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#8BB06A] text-white text-[11px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
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
            }}
          >
            <div style={{ width: 86, height: 86, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              {selectedRestaurant.cover_url ? (
                <img src={selectedRestaurant.cover_url} alt={selectedRestaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: selectedRestaurant.primary_color ? `linear-gradient(135deg,${selectedRestaurant.primary_color}aa,${selectedRestaurant.primary_color})` : 'linear-gradient(135deg,#8BB06A,#577A3D)' }} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1C1F1A', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 36 }}>
                {selectedRestaurant.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {selectedRestaurant.google_rating && selectedRestaurant.google_rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <GoogleLogo />
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1C1F1A' }}>{selectedRestaurant.google_rating.toFixed(1)}</span>
                    {selectedRestaurant.google_review_count != null && selectedRestaurant.google_review_count > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>({selectedRestaurant.google_review_count >= 1000 ? `${(selectedRestaurant.google_review_count / 1000).toFixed(1)}k` : selectedRestaurant.google_review_count})</span>
                    )}
                  </div>
                )}
                <span style={{ fontSize: '0.72rem', color: '#374151', background: '#F3F4F6', borderRadius: 99, padding: '2px 8px', fontWeight: 500 }}>
                  {RESTAURANT_TYPE_LABELS[selectedRestaurant.type] ?? selectedRestaurant.type}
                </span>
                {(() => {
                  const sel = visible.find(v => v.id === selectedRestaurant.id) ?? selectedRestaurant
                  return sel.distanceKm != null ? (
                    <span style={{ fontSize: '0.72rem', color: '#3D7A22', background: '#EEF5E6', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                      {formatDistance(sel.distanceKm)}
                    </span>
                  ) : selectedRestaurant.city ? (
                    <span style={{ fontSize: '0.72rem', color: '#374151', background: '#F3F4F6', borderRadius: 99, padding: '2px 8px', fontWeight: 500 }}>
                      {selectedRestaurant.city}
                    </span>
                  ) : null
                })()}
                <TagPills cuisine={selectedRestaurant.cuisine} dietary={selectedRestaurant.dietary} variant="light" max={2} />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EEF5E6', borderRadius: 99, padding: '3px 10px' }}>
                <span style={{ fontSize: '0.72rem' }}>📸</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3D7A22' }}>{selectedRestaurant.points_per_story}P für Story</span>
              </div>
            </div>

            <button
              onClick={e => { e.stopPropagation(); setSelectedRestaurant(null) }}
              aria-label="Schliessen"
              style={{
                position: 'absolute', top: 10, right: 10, width: 28, height: 28, minWidth: 28, minHeight: 28,
                borderRadius: '50%', background: 'rgba(0,0,0,0.08)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0,
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
          <FilterSheet
            filter={filter} setFilter={setFilter}
            cuisine={cuisineFilter} setCuisine={setCuisineFilter}
            dietary={dietaryFilter} setDietary={setDietaryFilter}
            onClose={() => setShowFilter(false)}
            resultCount={visible.length}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
