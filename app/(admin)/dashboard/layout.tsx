'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrialBanner } from '@/components/admin/TrialBanner'
import { ExpiredGate } from '@/components/shared/ExpiredGate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  useEffect(() => {
    const match = document.cookie.match(/impersonate_restaurant_id=([^;]+)/)
    if (match) {
      fetch('/api/dashboard/restaurant')
        .then(r => r.json())
        .then(({ restaurant }) => {
          if (restaurant?.name) setImpersonating(restaurant.name)
          if (restaurant?.id)   setRestaurantId(restaurant.id)
        })
        .catch(() => {})
    } else {
      // Normal owner — get their restaurant
      fetch('/api/dashboard/restaurant')
        .then(r => r.json())
        .then(({ restaurant }) => {
          if (restaurant?.id) setRestaurantId(restaurant.id)
        })
        .catch(() => {})
    }
  }, [])

  const exitImpersonation = () => {
    document.cookie = 'impersonate_restaurant_id=; path=/; max-age=0'
    setImpersonating(null)
    router.push('/admin/restaurants')
  }

  return (
    <>
      {impersonating && (
        <div
          id="impersonation-bar"
          className="fixed top-0 right-0 z-[100] text-white text-sm flex items-center justify-center gap-3 py-2 px-4 shadow-lg left-0 lg:left-[250px]"
          style={{ background: '#FF6B35' }}
        >
          <span className="truncate">👁️ Kundenansicht: <strong>{impersonating}</strong></span>
          <button
            onClick={exitImpersonation}
            className="ml-2 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0 min-h-[32px]"
            style={{ background: 'rgba(0,0,0,0.18)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.30)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.18)')}
          >
            ✕ Beenden
          </button>
        </div>
      )}
      <div className={impersonating ? 'pt-9' : ''}>
        <TrialBanner restaurantId={restaurantId} />
        <ExpiredGate restaurantId={restaurantId}>
          {children}
        </ExpiredGate>
      </div>
    </>
  )
}
