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

// ── "In deiner Nähe": echte Entfernung wenn Standort erlaubt, sonst Featured zuerst ──
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function sortByFeatured(list: Restaurant[]) {
  return [...list].sort((a, b) => {
    if (!!b.is_featured !== !!a.is_featured) return b.is_featured ? 1 : -1
    return a.name.localeCompare(b.name, 'de')
  })
}

async function sortNearby(list: Restaurant[]): Promise<Restaurant[]> {
  // Standort nur nutzen wenn Erlaubnis bereits erteilt wurde — kein aufdringlicher Prompt beim App-Start
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.geolocation) {
      const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      if (perm.state === 'granted') {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 300000 })
        )
        const { latitude, longitude } = pos.coords
        return [...list].sort((a, b) => {
          const da = a.latitude && a.longitude ? haversineKm(latitude, longitude, a.latitude, a.longitude) : Infinity
          const db = b.latitude && b.longitude ? haversineKm(latitude, longitude, b.latitude, b.longitude) : Infinity
          return da - db
        })
      }
    }
  } catch { /* Fallback unten */ }
  return sortByFeatured(list)
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const hasGoogle = restaurant.google_rating != null && restaurant.google_rating > 0
  const hasCover = !!restaurant.cover_url
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => router.push(`/restaurant/${restaurant.id}`)}
      className="flex-shrink-0 w-64 cursor-pointer snap-start"
    >
      <div
        className="w-64 h-40 rounded-3xl relative overflow-hidden"
        style={{ boxShadow: '0 8px 24px rgba(28,31,26,0.10)' }}
      >
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
        {/* Sanfter Verlauf für Lesbarkeit */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.12) 45%, transparent 65%)' }} />

        {/* Rating oben rechts — Glas-Pill */}
        {(hasGoogle || restaurant.avg_rating > 0) && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            borderRadius: 99, padding: '3px 9px',
            color: '#1C1F1A', fontSize: '0.72rem', fontWeight: 700,
          }}>
            <Star size={11} fill="#E5B84C" stroke="#E5B84C" />
            {(hasGoogle ? restaurant.google_rating! : restaurant.avg_rating).toFixed(1)}
          </span>
        )}

        {/* Name + Typ auf dem Bild */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
          <p className="text-white font-bold text-base leading-tight truncate drop-shadow" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {restaurant.name}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 500, marginTop: 2 }}>
            {RESTAURANT_TYPE_LABELS[restaurant.type]}{restaurant.city ? ` · ${restaurant.city}` : ''}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  const router = useRouter()
  const trigger = TRIGGER_CONFIG[deal.trigger]
  return (
    <div
      className="bg-white rounded-3xl overflow-hidden"
      style={{ boxShadow: '0 8px 24px rgba(28,31,26,0.07)' }}
    >
      {deal.image_url && (
        <div className="h-32 w-full relative overflow-hidden">
          <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          {deal.badge_text && (
            <span className="absolute bottom-2.5 left-3 text-xs bg-[#E5B84C] text-[#1C1F1A] font-bold px-2.5 py-1 rounded-full">
              {deal.badge_text}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 p-4">
        {!deal.image_url && (
          <div className="w-12 h-12 rounded-2xl bg-[#EEF5E6] flex items-center justify-center text-2xl flex-shrink-0">
            {trigger.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[#1C1F1A] font-semibold text-sm truncate">{deal.title}</p>
          <p className="text-[#1C1F1A]/45 text-xs truncate mt-0.5">{deal.restaurant?.name ?? ''}</p>
        </div>
        <button
          onClick={() => router.push(`/deals/${deal.id}`)}
          className="flex-shrink-0 gradient-primary text-white text-xs font-bold px-4 py-2.5 rounded-full active:scale-95 transition-transform"
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
          // Loop-Guard: nur EINMAL pro Session zum Onboarding umleiten.
          // Sonst: Onboarding-Update schlägt fehl → /home → /onboarding → /home → Endlosschleife.
          if (!p.onboarding_completed && !sessionStorage.getItem('ob_redirected')) {
            sessionStorage.setItem('ob_redirected', '1')
            router.push('/onboarding')
            return
          }
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
          supabase.from('restaurants').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('name').limit(10),
          supabase.from('deals').select('*, restaurant:restaurants(name)').eq('status', 'active').limit(5),
        ])

        if (rErr) throw rErr
        if (dErr) throw dErr
        setRestaurants(await sortNearby(rData ?? []))
        setDeals(dData ?? [])
      } catch {
        toast.error('Fehler beim Laden der Daten')
      } finally {
        setLoadingRestaurants(false)
        setLoadingDeals(false)
      }
    }
    load()

    // Realtime: update deals + restaurants live
    if (!IS_MOCK_MODE) {
      const channel = supabase
        .channel('home-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' },
          async () => {
            const { data } = await supabase.from('deals').select('*, restaurant:restaurants(name)').eq('status', 'active').limit(5)
            if (data) setDeals(data)
          })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants' },
          async () => {
            const { data } = await supabase.from('restaurants').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('name').limit(10)
            if (data) setRestaurants(await sortNearby(data))
          })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Gast'

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      {/* Header — läuft hinter die Statusleiste (Safe-Area), wie native iOS-Apps */}
      <div
        className="gradient-primary rounded-b-[2rem] pb-7 px-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <img src="/logo-white.png" alt="" className="w-8 h-8" />
            <span className="text-white font-bold text-base tracking-tight">gastro.pistazz.io</span>
          </div>
          <button
            onClick={() => router.push('/profil')}
            className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center active:bg-white/25 transition-colors"
          >
            <Bell size={18} className="text-white" />
          </button>
        </div>

        <h1 className="text-[1.75rem] font-bold text-white leading-tight" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Hey, {firstName}!
        </h1>
        <p className="text-white/70 text-sm mt-0.5 mb-4">Schön, dass du da bist.</p>

        <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full pl-2.5 pr-3.5 py-1.5 mb-5">
          <Star size={14} fill="#E5B84C" stroke="#E5B84C" />
          <span className="text-white text-sm font-semibold">{(profile?.available_points ?? 0).toLocaleString('de-DE')} Punkte</span>
        </div>

        <button
          onClick={() => router.push('/entdecken')}
          className="w-full flex items-center gap-2.5 bg-white/95 rounded-2xl px-4 py-3 text-left"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
        >
          <Search size={17} className="text-[#6D9450]" />
          <span className="text-[#1C1F1A]/45 text-sm">Restaurants suchen…</span>
        </button>
      </div>

      <div className="px-5 pt-6 space-y-7 pb-8">
        {/* Story CTA */}
        <div
          className="bg-white rounded-3xl p-5"
          style={{ boxShadow: '0 8px 24px rgba(28,31,26,0.07)' }}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF5E6] flex items-center justify-center text-xl flex-shrink-0">📸</div>
            <div className="flex-1 min-w-0">
              <p className="text-[#1C1F1A] font-bold text-base leading-snug">Story posten, Punkte sammeln</p>
              <p className="text-[#1C1F1A]/50 text-sm mt-0.5">QR-Code am Tisch scannen und loslegen.</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/entdecken')}
            className="mt-4 w-full gradient-primary text-white text-sm font-bold py-3 rounded-2xl active:scale-[0.98] transition-transform"
          >
            Restaurant wählen
          </button>
        </div>

        {/* Nearby restaurants */}
        <div>
          <div className="flex items-baseline justify-between mb-3.5">
            <h2 className="text-[#1C1F1A] font-bold text-lg" style={{ fontFamily: 'DM Serif Display, serif' }}>In deiner Nähe</h2>
            <button onClick={() => router.push('/entdecken')} className="text-[#6D9450] text-sm font-semibold">Alle</button>
          </div>
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 snap-x snap-mandatory">
            {loadingRestaurants
              ? Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} className="flex-shrink-0 w-64 h-40" />
                ))
              : restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        </div>

        {/* Deals */}
        <div>
          <div className="flex items-baseline justify-between mb-3.5">
            <h2 className="text-[#1C1F1A] font-bold text-lg" style={{ fontFamily: 'DM Serif Display, serif' }}>Deine Deals</h2>
            <button onClick={() => router.push('/deals')} className="text-[#6D9450] text-sm font-semibold">Alle</button>
          </div>
          <div className="space-y-3">
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
