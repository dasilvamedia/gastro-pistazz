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
    fetch('/api/dashboard/restaurant')
      .then(r => r.json())
      .then(({ restaurant }) => {
        if (match && restaurant?.name) setImpersonating(restaurant.name)
        if (restaurant?.id) setRestaurantId(restaurant.id)
      })
      .catch(() => {})
  }, [])

  const exitImpersonation = () => {
    document.cookie = 'impersonate_restaurant_id=; path=/; max-age=0'
    document.cookie = 'impersonate_restaurant_name=; path=/; max-age=0'
    setImpersonating(null)
    router.push('/admin/restaurants')
  }

  return (
    <>
      {impersonating && (
        // z-40 und links Platz fuer den Hamburger (z-50), damit der Menue-Button
        // auf dem Handy in der Kundenansicht tippbar bleibt
        <div
          id="impersonation-bar"
          className="fixed right-0 z-40 text-white text-sm flex items-center justify-center gap-3 py-2 pr-4 pl-14 lg:pl-4 shadow-lg left-0 lg:left-[250px]"
          style={{ background: '#FF6B35', top: 'env(safe-area-inset-top, 0px)' }}
        >
          <span className="truncate">👁️ Kundenansicht: <strong>{impersonating}</strong></span>
          <button
            onClick={exitImpersonation}
            className="ml-2 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0 min-h-[32px]"
            style={{ background: 'rgba(0,0,0,0.18)' }}
          >
            ✕ Beenden
          </button>
        </div>
      )}
      <div style={impersonating ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.25rem)' } : undefined}>
        <TrialBanner restaurantId={restaurantId} />
        <ExpiredGate restaurantId={restaurantId}>
          {children}
        </ExpiredGate>
      </div>
    </>
  )
}
