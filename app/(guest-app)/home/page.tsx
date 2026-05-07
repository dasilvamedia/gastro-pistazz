'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Restaurant, Deal } from '@/types'
import { TRIGGER_CONFIG, RESTAURANT_TYPE_LABELS } from '@/types'
import { MOCK_USER, MOCK_RESTAURANTS, MOCK_DEALS, IS_MOCK_MODE } from '@/lib/mock-data'

function SkeletonCard({ className }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} />
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push(`/restaurant/${restaurant.id}`)}
      className="flex-shrink-0 w-40 cursor-pointer"
    >
      <div
        className="w-40 h-28 rounded-2xl mb-2 flex items-end p-2"
        style={{
          background: restaurant.primary_color
            ? `linear-gradient(135deg, ${restaurant.primary_color}99, ${restaurant.primary_color})`
            : 'linear-gradient(135deg, #8BB06A, #577A3D)',
        }}
      >
        <span className="text-white text-xs font-semibold bg-black/20 px-2 py-0.5 rounded-full">
          ⭐ {restaurant.avg_rating?.toFixed(1) ?? '–'}
        </span>
      </div>
      <p className="text-[#1C1F1A] font-semibold text-sm truncate">{restaurant.name}</p>
      <p className="text-[#6D9450] text-xs">{RESTAURANT_TYPE_LABELS[restaurant.type]}</p>
    </motion.div>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  const router = useRouter()
  const trigger = TRIGGER_CONFIG[deal.trigger]
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-[#EEF5E6]">
      <div className="w-12 h-12 rounded-xl bg-[#EEF5E6] flex items-center justify-center text-2xl flex-shrink-0">
        {trigger.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#1C1F1A] font-semibold text-sm truncate">{deal.title}</p>
        <p className="text-[#6D9450] text-xs truncate">{deal.restaurant?.name ?? ''}</p>
      </div>
      <button
        onClick={() => router.push(`/deals/${deal.id}`)}
        className="flex-shrink-0 gradient-primary text-white text-xs font-bold px-3 py-2 rounded-xl"
      >
        Einlösen
      </button>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [loadingDeals, setLoadingDeals] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (IS_MOCK_MODE) {
        setProfile(MOCK_USER)
        setRestaurants(MOCK_RESTAURANTS)
        setDeals(MOCK_DEALS)
        setLoadingRestaurants(false)
        setLoadingDeals(false)
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (p) {
          if (!p.onboarding_completed) { router.push('/onboarding'); return }
          if (!p.full_name) {
            const metaName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
            if (metaName) {
              await supabase.from('profiles').update({ full_name: metaName }).eq('id', user.id)
              p.full_name = metaName
            }
          }
          setProfile(p)
        }

        const [{ data: rData, error: rErr }, { data: dData, error: dErr }] = await Promise.all([
          supabase.from('restaurants').select('*').eq('is_active', true).limit(10),
          supabase.from('deals').select('*, restaurant:restaurants(name)').eq('status', 'active').limit(5),
        ])

        if (rErr) throw rErr
        if (dErr) throw dErr
        setRestaurants(rData ?? [])
        setDeals(dData ?? [])
      } catch {
        toast.error('Fehler beim Laden der Daten')
      } finally {
        setLoadingRestaurants(false)
        setLoadingDeals(false)
      }
    }
    load()

    // Realtime: update deals live
    if (!IS_MOCK_MODE) {
      const channel = supabase
        .channel('home-deals-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' },
          async () => {
            const { data } = await supabase.from('deals').select('*, restaurant:restaurants(name)').eq('status', 'active').limit(5)
            if (data) setDeals(data)
          })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Gast'

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      {/* Header */}
      <div className="gradient-primary rounded-b-3xl pb-6 pt-12 px-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">🫙</span>
            </div>
            <span className="text-white font-bold text-base">pistazz.io</span>
          </div>
          <button className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <Bell size={18} className="text-white" />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Hey, {firstName}! 🤩
        </h1>

        <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 mb-4">
          <span className="text-white text-sm font-semibold">🏆 {profile?.available_points ?? 0} Punkte</span>
        </div>

        <div className="flex items-center gap-2 bg-white/25 rounded-full px-4 py-2.5">
          <Search size={16} className="text-white/70" />
          <span className="text-white/70 text-sm">Restaurants suchen...</span>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Story CTA */}
        <div className="bg-white rounded-2xl p-4 border-l-4 border-[#8BB06A] shadow-sm">
          <p className="text-[#1C1F1A] font-bold text-base">📸 Story posten = 500 Punkte 🎉</p>
          <p className="text-[#6D9450] text-sm mt-1 mb-3">Teile deinen Besuch und sammle Punkte!</p>
          <button
            onClick={() => router.push('/story/submit')}
            className="gradient-primary text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            Story einreichen →
          </button>
        </div>

        {/* Nearby restaurants */}
        <div>
          <h2 className="text-[#1C1F1A] font-bold text-lg mb-3">In deiner Nähe 📍</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {loadingRestaurants
              ? Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} className="flex-shrink-0 w-40 h-28" />
                ))
              : restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        </div>

        {/* Deals */}
        <div>
          <h2 className="text-[#1C1F1A] font-bold text-lg mb-3">Deine Deals 🔥</h2>
          <div className="space-y-2">
            {loadingDeals
              ? Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} className="h-16 w-full" />
                ))
              : deals.length === 0
              ? <p className="text-[#6D9450] text-sm text-center py-4">Keine Deals verfügbar</p>
              : deals.map((d) => <DealCard key={d.id} deal={d} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
