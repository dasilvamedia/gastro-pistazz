'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { PreviewBanner } from '@/components/layout/PreviewBanner'

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export default function GuestAppLayout({ children }: { children: React.ReactNode }) {
  const [hasPreview, setHasPreview] = useState(false)

  useEffect(() => {
    setHasPreview(!!getCookie('guest_preview_restaurant_name'))
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col">
      <PreviewBanner />
      <main className={`flex-1 pb-20 ${hasPreview ? 'pt-10' : ''}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
