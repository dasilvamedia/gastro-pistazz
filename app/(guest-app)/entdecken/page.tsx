'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, RestaurantType } from '@/types'
import { RESTAURANT_TYPE_LABELS } from '@/types'
import { MOCK_RESTAURANTS, IS_MOCK_MODE } from '@/lib/mock-data'

type FilterType = RestaurantType | 'alle'
type SortType = 'beliebtheit' | 'neu' | 'rating'

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'bistro', label: 'Bistro' },
  { value: 'cafe', label: 'Café' },
  { value: 'imbiss', label: 'Imbiss' },
  { value: 'food_truck', label: 'Food Truck' },
]

const sortOptions: { value: SortType; label: string }[] = [
  { value: 'beliebtheit', label: 'Beliebtheit' },
  { value: 'neu', label: 'Neu' },
  { value: 'rating', label: 'Rating' },
]

function GoogleStars({ rating, count }: { rating: number; count?: number | null }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.25 && rating - full < 0.75
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'full'
    if (i === full && half) return 'half'
    return 'empty'
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {stars.map((s, i) => (
        <span key={i} style={{ fontSize: '0.7rem', color: s === 'empty' ? '#d1d5db' : '#FBBC04' }}>
          {s === 'half' ? '★' : '★'}
        </span>
      ))}
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1C1F1A', marginLeft: 2 }}>{rating.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>
      )}
    </div>
  )
}

function RestaurantListCard({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const now = new Date()
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayKey = dayKeys[now.getDay()]
  const hours = restaurant.opening_hours?.[dayKey]
  const isOpen = hours && !hours.closed
  const hasGoogle = restaurant.google_rating != null && restaurant.google_rating > 0
  const hasCover = !!restaurant.cover_url

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/restaurant/${restaurant.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#EEF5E6] cursor-pointer"
    >
      {/* Cover image or gradient fallback */}
      <div className="w-full h-40 relative">
        {hasCover ? (
          <img
            src={restaurant.cover_url!}
            alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: restaurant.primary_color
                ? `linear-gradient(135deg, ${restaurant.primary_color}aa, ${restaurant.primary_color})`
                : 'linear-gradient(135deg, #8BB06A, #577A3D)',
            }}
          />
        )}
        {/* Gradient overlay for text readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />

        {/* Name + type badge bottom-left */}
        <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {restaurant.name}
          </h3>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', background: 'rgba(0,0,0,0.25)', padding: '1px 8px', borderRadius: 99 }}>
            {RESTAURANT_TYPE_LABELS[restaurant.type]}
          </span>
        </div>

        {/* Open/closed badge top-right */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700,
            padding: '3px 9px', borderRadius: 99,
            background: isOpen ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.85)',
            color: '#fff',
          }}>
            {isOpen ? 'Geöffnet' : 'Geschlossen'}
          </span>
        </div>

        {/* Logo top-left if present */}
        {restaurant.logo_url && (
          <div style={{ position: 'absolute', top: 10, left: 10, width: 36, height: 36, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <img src={restaurant.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-[#6D9450] text-xs truncate">{[restaurant.address, restaurant.city].filter(Boolean).join(', ')}</p>
          {/* Google rating or fallback */}
          {hasGoogle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              <GoogleStars rating={restaurant.google_rating!} count={restaurant.google_review_count} />
            </div>
          ) : restaurant.avg_rating > 0 ? (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1C1F1A', flexShrink: 0, marginLeft: 8 }}>
              ⭐ {restaurant.avg_rating.toFixed(1)}
            </span>
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

export default function EntdeckenPage() {
  const supabase = createClient()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('alle')
  const [sort, setSort] = useState<SortType>('beliebtheit')
  const [showSort, setShowSort] = useState(false)

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
      if (search) query = query.ilike('name', `%${search}%`)
      if (sort === 'rating') query = query.order('avg_rating', { ascending: false })
      else if (sort === 'neu') query = query.order('created_at', { ascending: false })
      else query = query.order('total_customers', { ascending: false })

      const { data, error } = await query.limit(30)
      if (error) throw error
      setRestaurants(data ?? [])
    } catch {
      toast.error('Fehler beim Laden der Restaurants')
    } finally {
      setLoading(false)
    }
  }, [filter, sort, search])

  useEffect(() => {
    const t = setTimeout(fetchRestaurants, 300)
    return () => clearTimeout(t)
  }, [fetchRestaurants])

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#EEF5E6] pt-12 pb-3 px-5 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1C1F1A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Entdecken 🔍
          </h1>
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
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
                filter === f.value
                  ? 'gradient-primary text-white shadow-sm'
                  : 'bg-white text-[#6D9450] border border-[#D4E8C2]'
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
          : restaurants.map(r => <RestaurantListCard key={r.id} restaurant={r} />)}
      </div>
    </div>
  )
}
