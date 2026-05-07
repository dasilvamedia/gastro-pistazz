'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  MapPin, Phone, Globe, Clock, Star,
  ChevronRight, Navigation, QrCode,
} from 'lucide-react'
import type { Restaurant, Deal } from '@/types'
import { TRIGGER_CONFIG } from '@/types'
import Link from 'next/link'

const DAYS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Mo' }, { key: 'tuesday', label: 'Di' }, { key: 'wednesday', label: 'Mi' },
  { key: 'thursday', label: 'Do' }, { key: 'friday', label: 'Fr' }, { key: 'saturday', label: 'Sa' },
  { key: 'sunday', label: 'So' },
]

function getTodayHours(openingHours: Record<string, { open: string; close: string; closed: boolean }> | null) {
  if (!openingHours) return null
  const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
  const h = openingHours[dayKey]
  if (!h || h.closed) return { open: false, text: 'Heute geschlossen' }
  const now = new Date()
  const [closeH, closeM] = (h.close ?? '22:00').split(':').map(Number)
  const [openH, openM] = (h.open ?? '09:00').split(':').map(Number)
  const totalMins = now.getHours() * 60 + now.getMinutes()
  const openMins = openH * 60 + openM
  const closeMins = closeH * 60 + closeM
  if (totalMins >= openMins && totalMins < closeMins) {
    return { open: true, text: `Geöffnet · bis ${h.close} Uhr` }
  }
  if (totalMins < openMins) {
    return { open: false, text: `Öffnet heute um ${h.open} Uhr` }
  }
  return { open: false, text: 'Heute geschlossen' }
}

export default function RestaurantLandingPage() {
  const { slug } = useParams<{ slug: string }>()
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'angebot' | 'info'>('angebot')
  const [stampCount, setStampCount] = useState(0)

  const loadData = useCallback(async () => {
    const [{ data: rest }, { data: user }] = await Promise.all([
      supabase.from('restaurants').select('*').eq('slug', slug).eq('is_active', true).single(),
      supabase.auth.getUser().then(r => ({ data: r.data.user })),
    ])

    if (!rest) { setLoading(false); return }
    setRestaurant(rest)

    const { data: d } = await supabase
      .from('deals').select('*').eq('restaurant_id', rest.id).eq('status', 'active')
    setDeals(d ?? [])

    if (user && rest.stamp_card_enabled) {
      const { data: sc } = await supabase
        .from('stamp_cards').select('current_stamps').eq('restaurant_id', rest.id).eq('user_id', user.id).single()
      setStampCount(sc?.current_stamps ?? 0)
    }
    setLoading(false)
  }, [slug, supabase])

  useEffect(() => { loadData() }, [loadData])

  // Real-time: Supabase postgres_changes subscription
  useEffect(() => {
    if (!restaurant?.id) return
    const ch = supabase.channel(`r-${restaurant.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${restaurant.id}` },
        (payload) => {
          // Merge updated fields immediately — no full round-trip needed for text/number changes
          setRestaurant(prev => prev ? { ...prev, ...(payload.new as typeof prev) } : prev)
          // Still do a full reload in case images etc. changed
          loadData()
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `restaurant_id=eq.${restaurant.id}` }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [restaurant?.id, loadData, supabase])

  // Fallback: re-fetch when tab becomes visible again (handles cases where
  // Supabase Realtime isn't active on the restaurants table)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1410] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#8BB06A] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#0f1410] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <QrCode className="w-12 h-12 text-[#8BB06A]/40" />
        <h1 className="text-white font-display text-xl">Restaurant nicht gefunden</h1>
        <p className="text-white/40 text-sm">Dieser QR-Code ist möglicherweise nicht mehr aktiv.</p>
      </div>
    )
  }

  const todayHours = getTodayHours(restaurant.opening_hours as Record<string, { open: string; close: string; closed: boolean }> | null)
  const primaryColor = restaurant.primary_color ?? '#8BB06A'

  return (
    <div className="min-h-screen bg-[#0f1410]">
      {/* ── Cover ────────────────────────────────────── */}
      <div className="relative h-64 overflow-hidden">
        {restaurant.cover_url ? (
          <img key={restaurant.cover_url} src={restaurant.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primaryColor}66 0%, #0f1410 100%)` }} />
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0f1410]" />

        {/* Logo — overlaps cover */}
        <div className="absolute -bottom-8 left-5">
          <div className="w-20 h-20 rounded-2xl border-4 border-[#0f1410] overflow-hidden shadow-2xl"
            style={{ background: primaryColor + '33', backdropFilter: 'blur(10px)' }}>
            {restaurant.logo_url
              ? <img key={restaurant.logo_url} src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full" style={{ objectFit: 'contain' }} />
              : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="px-4 pt-12 pb-24 max-w-lg mx-auto space-y-4">

        {/* Name + status */}
        <div>
          <h1 className="text-white text-2xl font-display leading-tight">{restaurant.name}</h1>
          {restaurant.city && <p className="text-white/40 text-sm mt-0.5">{restaurant.city}</p>}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {todayHours && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              todayHours.open
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${todayHours.open ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {todayHours.text}
            </span>
          )}
          {restaurant.website && (
            <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 text-white/60 hover:text-white transition-colors">
              <Globe className="w-3 h-3" />Speisekarte
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/8 backdrop-blur-sm">
          {([
            { key: 'angebot', label: '🎁 Angebot' },
            { key: 'info', label: '📍 Informationen' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'text-white shadow-lg'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={tab === t.key ? { background: primaryColor } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Angebot ── */}
        {tab === 'angebot' && (
          <div className="space-y-3">

            {/* Instagram Story card */}
            <div className="rounded-2xl overflow-hidden border border-white/8"
              style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1410 100%)' }}>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold"
                    style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                    IG
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Instagram Story</p>
                    <p className="text-white/40 text-xs">{restaurant.points_per_story ?? 500} Punkte verdienen</p>
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  Nach erfolgreichem Erstellen einer Instagram-Story über {restaurant.name} erhältst du attraktive Punkte und exklusive Benefits!
                </p>
                <Link href={`/story/submit?restaurant=${slug}`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ background: primaryColor }}>
                  Jetzt teilnehmen
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Stempelkarte */}
            {restaurant.stamp_card_enabled && (
              <div className="rounded-2xl border border-white/8 backdrop-blur-md p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" style={{ color: primaryColor }} />
                  <p className="text-white font-semibold text-sm">Stempelkarte</p>
                  <span className="ml-auto text-white/40 text-xs">{stampCount} / {restaurant.stamp_card_total ?? 10}</span>
                </div>
                {/* Stamp dots */}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: restaurant.stamp_card_total ?? 10 }).map((_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                      i < stampCount
                        ? 'text-white'
                        : 'border-white/15 bg-white/5'
                    }`} style={i < stampCount ? { background: primaryColor, borderColor: primaryColor } : {}}>
                      {i < stampCount ? '✓' : ''}
                    </div>
                  ))}
                </div>
                {restaurant.stamp_card_reward && (
                  <p className="text-white/50 text-xs">
                    Belohnung: <span className="text-white/80 font-medium">{restaurant.stamp_card_reward}</span>
                  </p>
                )}
              </div>
            )}

            {/* Deals */}
            {deals.length > 0 && (
              <div className="space-y-3">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Aktuelle Deals</p>
                {deals.map(deal => {
                  const trigger = TRIGGER_CONFIG[deal.trigger] ?? { emoji: '🎁' }
                  return (
                    <div key={deal.id}
                      className="rounded-2xl border border-white/8 overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>

                      {/* Deal image — full, no crop */}
                      {deal.image_url && (
                        <div className="w-full bg-black/20">
                          <img
                            src={deal.image_url}
                            alt={deal.title}
                            className="w-full h-auto max-h-56"
                            style={{ objectFit: 'contain', display: 'block' }}
                          />
                        </div>
                      )}

                      <div className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: primaryColor + '22' }}>
                          {trigger.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">{deal.title}</p>
                          {deal.badge_text && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                              style={{ background: primaryColor + '33', color: primaryColor }}>
                              {deal.badge_text}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {deals.length === 0 && !restaurant.stamp_card_enabled && (
              <div className="text-center py-8 text-white/30 text-sm">
                Noch keine Deals verfügbar
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Info ── */}
        {tab === 'info' && (
          <div className="space-y-3">
            {/* Description */}
            {restaurant.description && (
              <div className="rounded-2xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-white/70 text-sm leading-relaxed">{restaurant.description}</p>
              </div>
            )}

            {/* Contact */}
            <div className="rounded-2xl border border-white/8 p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {restaurant.address && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address} ${restaurant.city}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: primaryColor + '22' }}>
                    <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{restaurant.address}</p>
                    <p className="text-white/40 text-xs">{restaurant.zip} {restaurant.city}</p>
                  </div>
                  <Navigation className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                </a>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: primaryColor + '22' }}>
                    <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <p className="text-white text-sm">{restaurant.phone}</p>
                </a>
              )}
              {restaurant.website && (
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: primaryColor + '22' }}>
                    <Globe className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <p className="text-white text-sm truncate">{restaurant.website.replace(/^https?:\/\//, '')}</p>
                </a>
              )}
              {restaurant.instagram_handle && (
                <a href={`https://instagram.com/${restaurant.instagram_handle.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                    IG
                  </div>
                  <p className="text-white text-sm">{restaurant.instagram_handle}</p>
                </a>
              )}
            </div>

            {/* Opening hours */}
            {restaurant.opening_hours && (
              <div className="rounded-2xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" style={{ color: primaryColor }} />
                  <p className="text-white font-semibold text-sm">Öffnungszeiten</p>
                </div>
                <div className="space-y-2">
                  {DAYS.map(({ key, label }) => {
                    const h = (restaurant.opening_hours as Record<string, { open: string; close: string; closed: boolean }>)?.[key]
                    const isToday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()] === key
                    return (
                      <div key={key} className={`flex justify-between items-center text-sm rounded-lg px-2 py-1 ${isToday ? 'bg-white/8' : ''}`}>
                        <span className={isToday ? 'text-white font-medium' : 'text-white/40'}>{label}</span>
                        <span className={!h || h.closed
                          ? 'text-red-400/70 text-xs'
                          : isToday ? 'font-semibold text-xs' : 'text-white/60 text-xs'}
                          style={isToday && h && !h.closed ? { color: primaryColor } : {}}>
                          {!h || h.closed ? 'Geschlossen' : `${h.open} – ${h.close}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="rounded-2xl border border-white/8 p-4 grid grid-cols-3 gap-3 text-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div>
                <p className="text-white font-bold text-xl">{restaurant.total_customers ?? 0}</p>
                <p className="text-white/40 text-xs mt-0.5">Gäste</p>
              </div>
              <div>
                <p className="text-white font-bold text-xl">{restaurant.total_stories ?? 0}</p>
                <p className="text-white/40 text-xs mt-0.5">Stories</p>
              </div>
              <div>
                <p className="text-white font-bold text-xl" style={{ color: primaryColor }}>{restaurant.points_per_story ?? 500}</p>
                <p className="text-white/40 text-xs mt-0.5">Pkt/Story</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Floating bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-lg mx-auto">
        <div className="rounded-2xl border border-white/10 p-3 flex items-center gap-3"
          style={{ background: 'rgba(15,20,16,0.90)', backdropFilter: 'blur(20px)' }}>
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0"
            style={{ background: primaryColor + '33' }}>
            {restaurant.logo_url
              ? <img src={restaurant.logo_url} alt="" className="w-full h-full" style={{ objectFit: 'contain' }} />
              : <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{restaurant.name}</p>
            <p className="text-white/30 text-xs">Powered by pistazz.io</p>
          </div>
          <Link href={`/register?restaurant=${slug}`}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex-shrink-0"
            style={{ background: primaryColor }}>
            Punkte sammeln
          </Link>
        </div>
      </div>
    </div>
  )
}
