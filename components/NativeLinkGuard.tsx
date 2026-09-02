'use client'

/**
 * Sicherheitsnetz: In der nativen App darf KEIN Link jemals Safari oeffnen.
 * Faengt jeden Klick auf externe http(s)-Links global ab und leitet ihn in
 * den In-App-Browser (Build 15+) bzw. blockt den Safari-Absprung.
 */
import { useEffect } from 'react'
import { isNativeApp, openWebsite } from '@/lib/nativeLinks'

export default function NativeLinkGuard() {
  useEffect(() => {
    if (!isNativeApp()) return
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (!/^https?:\/\//i.test(href)) return
      try {
        const url = new URL(href)
        if (url.hostname === window.location.hostname) return // eigene Domain
      } catch { return }
      e.preventDefault()
      e.stopPropagation()
      openWebsite(href)
    }
    // Capture-Phase: greift VOR allen anderen Handlern
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  return null
}
