'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Restaurant } from '@/types'
import { RESTAURANT_TYPE_LABELS } from '@/types'
import { formatDistance, type WithDistance } from '@/lib/geo'
import { TagPills } from '@/components/ui/TagPills'

export function GoogleStars({ rating, count }: { rating: number; count?: number | null }) {
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

export function GoogleLogo({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export function RestaurantListCard({ restaurant }: { restaurant: WithDistance<Restaurant> }) {
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
          <img src={restaurant.cover_url} alt={restaurant.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: restaurant.primary_color ? `linear-gradient(135deg, ${restaurant.primary_color}aa, ${restaurant.primary_color})` : 'linear-gradient(135deg, #8BB06A, #577A3D)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow" style={{ fontFamily: 'DM Serif Display, serif' }}>{restaurant.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', background: 'rgba(0,0,0,0.25)', padding: '1px 8px', borderRadius: 99 }}>{RESTAURANT_TYPE_LABELS[restaurant.type] ?? restaurant.type}</span>
            <TagPills cuisine={restaurant.cuisine} dietary={restaurant.dietary} variant="glass" max={2} />
          </div>
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
          {restaurant.distanceKm != null && (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(255,255,255,0.92)', color: '#3D7A22' }}>
              {formatDistance(restaurant.distanceKm)}
            </span>
          )}
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: isOpen ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.85)', color: '#fff' }}>
            {isOpen ? 'Geöffnet' : 'Geschlossen'}
          </span>
        </div>
        {restaurant.logo_url && (
          <div style={{ position: 'absolute', top: 10, left: 10, width: 36, height: 36, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <img src={restaurant.logo_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-[#6D9450] text-xs truncate">{[restaurant.address, restaurant.city].filter(Boolean).join(', ')}</p>
          {hasGoogle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <GoogleLogo />
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

export function SkeletonCard() {
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
