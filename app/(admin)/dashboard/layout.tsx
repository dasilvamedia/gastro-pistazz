'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [impersonating, setImpersonating] = useState<string | null>(null)

  useEffect(() => {
    // Check if super admin is impersonating a restaurant
    const match = document.cookie.match(/impersonate_restaurant_id=([^;]+)/)
    if (match) {
      // Get restaurant name from the API
      fetch('/api/dashboard/restaurant')
        .then(r => r.json())
        .then(({ restaurant }) => {
          if (restaurant?.name) setImpersonating(restaurant.name)
        })
        .catch(() => {})
    }
  }, [])

  const exitImpersonation = () => {
    // Clear the impersonation cookie
    document.cookie = 'impersonate_restaurant_id=; path=/; max-age=0'
    setImpersonating(null)
    router.push('/admin/restaurants')
  }

  return (
    <>
      {impersonating && (
        <div
          className="fixed top-0 right-0 z-[100] text-white text-sm flex items-center justify-center gap-3 py-2 px-4 shadow-lg"
          style={{ background: '#FF6B35', left: '250px' }}
        >
          <span>👁️ Kundenansicht: <strong>{impersonating}</strong></span>
          <button
            onClick={exitImpersonation}
            className="ml-2 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors"
            style={{ background: 'rgba(0,0,0,0.18)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.30)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.18)')}
          >
            ✕ Beenden
          </button>
        </div>
      )}
      <div className={impersonating ? 'pt-9' : ''}>{children}</div>
    </>
  )
}
