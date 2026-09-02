'use client'

/**
 * Vom linken Rand nach rechts wischen = zurueck, mit echter Folge-Animation:
 * die Seite haengt am Finger, gleitet beim Loslassen raus (oder federt
 * zurueck). Ab App-Build 13 uebernimmt die native WebView-Geste (inkl.
 * System-Animation), dieser Web-Fallback deaktiviert sich dann selbst.
 */
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const SHELL_ID = 'guest-shell'

export default function EdgeSwipeBack() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Die Kamera hat eigene Wisch-Gesten (Modi-Wechsel), dort nicht eingreifen
    if (pathname.startsWith('/story/create')) return

    let nativeGesture = false
    const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { getInfo: () => Promise<{ build: string }> } } } }).Capacitor
    cap?.Plugins?.App?.getInfo()
      .then(i => { if (parseInt(i.build, 10) >= 13) nativeGesture = true })
      .catch(() => {})

    let active = false
    let sx = 0, sy = 0
    let raf = 0
    let curX = 0

    const shell = () => document.getElementById(SHELL_ID)

    const apply = () => {
      raf = 0
      const el = shell()
      if (!el) return
      el.style.transition = 'none'
      el.style.transform = `translate3d(${curX}px, 0, 0)`
      el.style.boxShadow = curX > 0 ? '-24px 0 40px rgba(0,0,0,0.18)' : ''
    }

    const reset = (animate: boolean) => {
      const el = shell()
      if (!el) return
      el.style.transition = animate ? 'transform 0.24s cubic-bezier(0.22, 0.9, 0.36, 1)' : 'none'
      el.style.transform = 'translate3d(0, 0, 0)'
      el.style.boxShadow = ''
      if (!animate) requestAnimationFrame(() => { el.style.transition = '' })
    }

    const onStart = (e: TouchEvent) => {
      if (nativeGesture) return
      const t = e.touches[0]
      if (t.clientX <= 28) { active = true; sx = t.clientX; sy = t.clientY; curX = 0 }
    }
    const onMove = (e: TouchEvent) => {
      if (!active) return
      const t = e.touches[0]
      const dx = t.clientX - sx
      const dy = Math.abs(t.clientY - sy)
      // Deutlich vertikal = Scrollen, Geste abbrechen
      if (dy > 70 && dy > dx) { active = false; reset(true); return }
      curX = Math.max(0, dx)
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onEnd = () => {
      if (!active) return
      active = false
      const el = shell()
      if (!el) return
      if (curX > Math.min(110, window.innerWidth * 0.28)) {
        // Rausgleiten, dann navigieren; danach steht die neue Seite sauber da
        el.style.transition = 'transform 0.22s ease-out'
        el.style.transform = `translate3d(${window.innerWidth}px, 0, 0)`
        setTimeout(() => {
          router.back()
          setTimeout(() => reset(false), 60)
        }, 210)
      } else {
        reset(true)
      }
      curX = 0
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
      reset(false)
    }
  }, [pathname, router])

  return null
}
