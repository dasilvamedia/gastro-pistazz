'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Globe, MapPin, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, Deal, StampCard } from '@/types'
import { RESTAURANT_TYPE_LABELS, TRIGGER_CONFIG } from '@/types'
import { MOCK_RESTAURANTS, MOCK_DEALS, IS_MOCK_MODE } from '@/lib/mock-data'

type Tab = 'ubersicht' | 'deals' | 'info'

const DAYS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' },
]

function StampProgress({ card, restaurant }: { card: StampCard | null; restaurant: Restaurant }) {
  if (!restaurant.stamp_card_enabled) return null
  const total = restaurant.stamp_card_total || 10
  const current = card?.current_stamps ?? 0
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6]">
      <h3 className="text-[#1C1F1A] font-bold mb-1">Stempelkarte 🃏</h3>
      <p className="text-[#6D9450] text-sm mb-3">{current} von {total} Stempeln gesammelt</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
              i < current
                ? 'border-[#8BB06A] bg-[#8BB06A] text-white'
                : 'border-[#D4E8C2] bg-[#EEF5E6]'
            }`}
          >
            {i < current ? '✓' : ''}
          </div>
        ))}
      </div>
      {restaurant.stamp_card_reward && (
        <p className="text-[#1C1F1A] text-sm">
          <span className="font-semibold">Belohnung:</span> {restaurant.stamp_card_reward}
        </p>
      )}
    </div>
  )
}

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [stampCard, setStampCard] = useState<StampCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('ubersicht')

  useEffect(() => {
    const load = async () => {
      if (IS_MOCK_MODE) {
        const mockRestaurant = MOCK_RESTAURANTS.find(r => r.id === id) ?? MOCK_RESTAURANTS[0]
        setRestaurant(mockRestaurant)
        setDeals(MOCK_DEALS.filter(d => d.restaurant_id === mockRestaurant.id))
        setLoading(false)
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const [{ data: r, error: rErr }, { data: d }] = await Promise.all([
          supabase.from('restaurants').select('*').eq('id', id).single(),
          supabase.from('deals').select('*').eq('restaurant_id', id).eq('status', 'active'),
        ])

        if (rErr) throw rErr
        setRestaurant(r)
        setDeals(d ?? [])

        if (user && r?.stamp_card_enabled) {
          const { data: sc } = await supabase
            .from('stamp_cards')
            .select('*')
            .eq('restaurant_id', id)
            .eq('user_id', user.id)
            .single()
          setStampCard(sc ?? null)
        }
      } catch {
        toast.error('Restaurant nicht gefunden')
        router.back()
      } finally {
        setLoading(false)
      }
    }
    load()

    if (!IS_MOCK_MODE) {
      const channel = supabase
        .channel(`restaurant-detail-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${id}` },
          (payload) => { setRestaurant(payload.new as Restaurant) })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `restaurant_id=eq.${id}` },
          async () => {
            const { data } = await supabase.from('deals').select('*').eq('restaurant_id', id).eq('status', 'active')
            if (data) setDeals(data)
          })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF5E6]">
        <div className="skeleton h-52 w-full" />
        <div className="px-5 pt-5 space-y-3">
          <div className="skeleton h-8 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
        </div>
      </div>
    )
  }

  if (!restaurant) return null

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      {/* Cover */}
      <div className="relative h-52 w-full overflow-hidden">
        {restaurant.cover_url ? (
          <img src={restaurant.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: restaurant.primary_color
                ? `linear-gradient(135deg, ${restaurant.primary_color}aa, ${restaurant.primary_color})`
                : 'linear-gradient(135deg, #8BB06A, #577A3D)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
      </div>

      {/* Logo + info */}
      <div className="px-5 relative">
        <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md -mt-8 mb-3 flex items-center justify-center text-2xl z-10 relative">
          {restaurant.logo_url
            ? <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px', borderRadius: '10px', display: 'block' }} />
            : '🍽️'}
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1F1A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-[#EEF5E6] text-[#6D9450] text-xs font-medium px-2 py-0.5 rounded-full">
                {RESTAURANT_TYPE_LABELS[restaurant.type]}
              </span>
              <span className="text-[#1C1F1A] text-sm font-semibold">
                ⭐ {restaurant.avg_rating?.toFixed(1) ?? '-'}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/story/submit?restaurant=${restaurant.slug}`)}
            className="gradient-primary text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            Jetzt teilnehmen
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 border border-[#EEF5E6] mb-4">
          {([
            { key: 'ubersicht', label: 'Übersicht' },
            { key: 'deals', label: 'Deals' },
            { key: 'info', label: 'Info' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key ? 'gradient-primary text-white shadow-sm' : 'text-[#6D9450]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'ubersicht' && (
          <div className="space-y-3">
            {restaurant.description && (
              <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6]">
                <p className="text-[#6D9450] text-sm leading-relaxed">{restaurant.description}</p>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6] grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[#1C1F1A] font-bold text-xl">{restaurant.total_customers}</p>
                <p className="text-[#6D9450] text-xs">Gäste</p>
              </div>
              <div>
                <p className="text-[#1C1F1A] font-bold text-xl">{restaurant.total_stories}</p>
                <p className="text-[#6D9450] text-xs">Stories</p>
              </div>
              <div>
                <p className="text-[#1C1F1A] font-bold text-xl">{restaurant.points_per_story}</p>
                <p className="text-[#6D9450] text-xs">P/Story</p>
              </div>
            </div>
            <StampProgress card={stampCard} restaurant={restaurant} />
          </div>
        )}

        {tab === 'deals' && (
          <div className="space-y-3">
            {deals.length === 0
              ? <p className="text-center text-[#6D9450] py-8">Keine Deals verfügbar</p>
              : deals.map(d => {
                  const trigger = TRIGGER_CONFIG[d.trigger]
                  return (
                    <div key={d.id} className="bg-white rounded-2xl overflow-hidden border border-[#EEF5E6]">
                      {/* Cover image or gradient */}
                      <div
                        className="h-36 w-full relative overflow-hidden flex items-end p-3"
                        style={!d.image_url ? {
                          background: `linear-gradient(135deg, ${d.badge_color || '#8BB06A'}99, ${d.badge_color || '#6D9450'})`,
                        } : undefined}
                      >
                        {d.image_url && (
                          <img src={d.image_url} alt={d.title} className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="relative z-10 flex items-center justify-between w-full">
                          <span className="text-white font-bold text-sm drop-shadow">{d.title}</span>
                          {d.badge_text && (
                            <span className="text-xs bg-[#E5B84C] text-[#1C1F1A] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                              {d.badge_text}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-3 flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">{trigger.emoji}</span>
                        <span className="text-xs text-[#6D9450] flex-1">{trigger.label}</span>
                        <button
                          onClick={() => router.push(`/deals/${d.id}`)}
                          className="gradient-primary text-white font-bold py-2 px-4 rounded-xl text-xs flex-shrink-0"
                        >
                          Einlösen
                        </button>
                      </div>
                    </div>
                  )
                })}
          </div>
        )}

        {tab === 'info' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6] space-y-3">
              {restaurant.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#8BB06A] flex-shrink-0 mt-0.5" />
                  <p className="text-[#1C1F1A] text-sm">{restaurant.address}, {restaurant.zip} {restaurant.city}</p>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-[#8BB06A]" />
                  <a href={`tel:${restaurant.phone}`} className="text-[#6D9450] text-sm underline">{restaurant.phone}</a>
                </div>
              )}
              {restaurant.website && (
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-[#8BB06A]" />
                  <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-[#6D9450] text-sm underline truncate">
                    {restaurant.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Google Maps Embed */}
            {(restaurant.latitude && restaurant.longitude) ? (
              <div className="bg-white rounded-2xl overflow-hidden border border-[#EEF5E6]">
                <iframe
                  title="Karte"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${restaurant.longitude - 0.005},${restaurant.latitude - 0.003},${restaurant.longitude + 0.005},${restaurant.latitude + 0.003}&layer=mapnik&marker=${restaurant.latitude},${restaurant.longitude}`}
                />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-[#6D9450] text-sm font-medium hover:bg-[#EEF5E6] transition-colors"
                >
                  <Navigation size={14} />
                  In Google Maps öffnen
                </a>
              </div>
            ) : restaurant.address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address} ${restaurant.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-[#EEF5E6]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EEF5E6] flex items-center justify-center">
                  <Navigation size={18} className="text-[#6D9450]" />
                </div>
                <div>
                  <p className="text-[#1C1F1A] font-semibold text-sm">Route anzeigen</p>
                  <p className="text-[#6D9450] text-xs">In Google Maps öffnen</p>
                </div>
              </a>
            ) : null}

            <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6]">
              <h3 className="text-[#1C1F1A] font-bold mb-3">Öffnungszeiten</h3>
              <div className="space-y-2">
                {DAYS.map(({ key, label }) => {
                  const h = restaurant.opening_hours?.[key]
                  return (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="text-[#6D9450]">{label}</span>
                      <span className={`font-medium ${h?.closed ? 'text-[#E86B5A]' : 'text-[#1C1F1A]'}`}>
                        {!h || h.closed ? 'Geschlossen' : `${h.open} bis ${h.close}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
