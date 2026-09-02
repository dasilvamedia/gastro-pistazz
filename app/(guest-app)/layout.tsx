'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { PreviewBanner } from '@/components/layout/PreviewBanner'
import EdgeSwipeBack from '@/components/EdgeSwipeBack'

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
    // Fixed-Shell statt Body-Scroll: body/html scrollen hier nie, nur <main>
    // scrollt intern. Sonst "wandert" die fixed-positionierte BottomNav in
    // WKWebView (iOS) sichtbar mit, sobald man scrollt.
    <div id="guest-shell" className="fixed inset-0 flex flex-col overflow-hidden">
      <EdgeSwipeBack />
      <PreviewBanner />
      <main
        className={`flex-1 overflow-y-auto pb-20 ${hasPreview ? 'pt-10' : ''}`}
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' } as React.CSSProperties}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
