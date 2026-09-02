'use client'

/**
 * Vom linken Rand nach rechts wischen = zurueck (wie ueberall auf iOS).
 * Ab App-Build 13 uebernimmt die native WebView-Geste (mit Slide-Animation),
 * dieser Web-Fallback deaktiviert sich dann selbst. Im Browser/PWA und auf
 * aelteren Builds greift er immer.
 */
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function EdgeSwipeBack() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Die Kamera hat eigene Wisch-Gesten (Modi-Wechsel), dort nicht eingreifen
    if (pathname.startsWith('/story/create')) return

    let active = false
    let fired = false
    let sx = 0, sy = 0
    let nativeGesture = false
    const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { getInfo: () => Promise<{ build: string }> } } } }).Capacitor
    cap?.Plugins?.App?.getInfo()
      .then(i => { if (parseInt(i.build, 10) >= 13) nativeGesture = true })
      .catch(() => {})

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t.clientX <= 24) { active = true; fired = false; sx = t.clientX; sy = t.clientY }
    }
    const onMove = (e: TouchEvent) => {
      if (!active || fired || nativeGesture) return
      const t = e.touches[0]
      const dx = t.clientX - sx
      const dy = Math.abs(t.clientY - sy)
      if (dx > 70 && dy < 60) { fired = true; router.back() }
    }
    const onEnd = () => { active = false }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [pathname, router])

  return null
}
