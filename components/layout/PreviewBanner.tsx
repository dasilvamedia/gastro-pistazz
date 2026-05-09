'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X } from 'lucide-react'

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export function PreviewBanner() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState<string | null>(null)

  useEffect(() => {
    const name = getCookie('guest_preview_restaurant_name')
    if (name) setRestaurantName(name)
  }, [])

  const exit = () => {
    document.cookie = 'guest_preview_restaurant_id=; path=/; max-age=0'
    document.cookie = 'guest_preview_restaurant_name=; path=/; max-age=0'
    setRestaurantName(null)
    router.push('/admin/restaurants')
  }

  if (!restaurantName) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-semibold shadow-lg"
      style={{ background: '#FF6B35' }}
    >
      <Eye className="w-4 h-4 shrink-0" />
      <span>
        Kundenansicht&nbsp;&mdash;&nbsp;<strong>{restaurantName}</strong>
      </span>
      <button
        onClick={exit}
        aria-label="Kundenansicht beenden"
        className="ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
        style={{ background: 'rgba(0,0,0,0.18)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.30)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.18)')}
      >
        <X className="w-3 h-3" />
        Beenden
      </button>
    </div>
  )
}
