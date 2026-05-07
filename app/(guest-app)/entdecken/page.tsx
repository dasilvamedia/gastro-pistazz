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

function RestaurantListCard({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const now = new Date()
  const day = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'][now.getDay()]
  const hours = restaurant.opening_hours?.[day]
  const isOpen = hours && !hours.closed

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/restaurant/${restaurant.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#EEF5E6] cursor-pointer"
    >
      <div
        className="w-full h-36 relative flex items-end p-3"
        style={{
          background: restaurant.primary_color
            ? `linear-gradient(135deg, ${restaurant.primary_color}aa, ${restaurant.primary_color})`
            : 'linear-gradient(135deg, #8BB06A, #577A3D)',
        }}
      >
        <div className="flex items-end justify-between w-full">
          <div>
            <h3 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {restaurant.name}
            </h3>
            <span className="text-white/80 text-xs bg-black/20 px-2 py-0.5 rounded-full">
              {RESTAURANT_TYPE_LABELS[restaurant.type]}
            </span>
          </div>
          <span className="text-white font-semibold text-sm bg-black/25 px-2 py-1 rounded-xl">
            ⭐ {restaurant.avg_rating?.toFixed(1) ?? '–'}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[#6D9450] text-xs">{restaurant.address}, {restaurant.city}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {isOpen ? 'Geöffnet' : 'Geschlossen'}
          </span>
        </div>
        <p className="text-[#8BB06A] text-xs font-medium">📸 500P für Story</p>
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
