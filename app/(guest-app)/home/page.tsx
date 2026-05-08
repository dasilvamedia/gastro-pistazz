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
  const hasGoogle = restaurant.google_rating != null && restaurant.google_rating > 0
  const hasCover = !!restaurant.cover_url
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push(`/restaurant/${restaurant.id}`)}
      className="flex-shrink-0 w-44 cursor-pointer"
    >
      <div className="w-44 h-28 rounded-2xl mb-2 relative overflow-hidden">
        {hasCover ? (
          <img
            src={restaurant.cover_url!}
            alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: restaurant.primary_color
              ? `linear-gradient(135deg, ${restaurant.primary_color}99, ${restaurant.primary_color})`
              : 'linear-gradient(135deg, #8BB06A, #577A3D)',
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }} />

        {/* Logo top-left */}
        {restaurant.logo_url && (
          <div style={{ position: 'absolute', top: 6, left: 6, width: 28, height: 28, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={restaurant.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
          </div>
        )}

        {/* Rating bottom-right */}
        <div style={{ position: 'absolute', bottom: 6, right: 6 }}>
          {hasGoogle ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.35)', borderRadius: 99, padding: '2px 7px' }}>
              <svg width="10" height="10" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{restaurant.google_rating!.toFixed(1)}</span>
            </span>
          ) : restaurant.avg_rating > 0 ? (
            <span style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>
              ⭐ {restaurant.avg_rating.toFixed(1)}
            </span>
          ) : null}
        </div>
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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#EEF5E6]">
      {deal.image_url && (
        <div className="h-28 w-full relative overflow-hidden">
          <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {deal.badge_text && (
            <span className="absolute bottom-2 left-2 text-xs bg-[#E5B84C] text-[#1C1F1A] font-bold px-2 py-0.5 rounded-full">
              {deal.badge_text}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 p-3">
        {!deal.image_url && (
          <div className="w-12 h-12 rounded-xl bg-[#EEF5E6] flex items-center justify-center text-2xl flex-shrink-0">
            {trigger.emoji}
          </div>
        )}
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
          <p className="text-[#1C1F1A] font-bold text-base">📸 Story posten = Punkte 🎉</p>
          <p className="text-[#6D9450] text-sm mt-1 mb-3">Besuche ein Restaurant, scan den QR-Code und sammle Punkte!</p>
          <button
            onClick={() => router.push('/entdecken')}
            className="gradient-primary text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            Restaurant entdecken →
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
