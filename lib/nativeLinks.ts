'use client'

/**
 * Externe Ziele, ohne dass die Nutzer jemals in Safari landen:
 * - Websites: In-App-Browser-Sheet (ab Build 15), sonst neuer Tab (Web)
 * - Instagram-Profile: direkt die Instagram-App
 * - Karten: direkt die Karten-App (Apple Maps in der iOS-App)
 */

type Cap = {
  isNativePlatform?: () => boolean
  Plugins?: { InAppBrowser?: { open: (o: { url: string }) => Promise<unknown> } }
}
const cap = () => (typeof window !== 'undefined' ? (window as unknown as { Capacitor?: Cap }).Capacitor : undefined)

export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.()
}

/** Website oeffnen: In-App-Sheet in der App, neuer Tab im Web */
export function openWebsite(url: string) {
  if (!url) return
  const browser = cap()?.Plugins?.InAppBrowser
  if (browser) { browser.open({ url }).catch(() => { window.location.href = url }); return }
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Instagram-Profil: App-Deep-Link in der App, Web-Profil im Browser-Tab */
export function openInstagram(handle: string) {
  const clean = handle.replace(/^@+/, '')
  if (isNativeApp()) {
    // Oeffnet die Instagram-App direkt beim Profil
    window.location.href = `instagram://user?username=${clean}`
    return
  }
  window.open(`https://instagram.com/${clean}`, '_blank', 'noopener,noreferrer')
}

/** Karten: Apple-Maps-App in der iOS-App, Google Maps im Web */
export function openMaps(query: string) {
  const q = encodeURIComponent(query)
  if (isNativeApp()) {
    window.location.href = `maps://?q=${q}`
    return
  }
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer')
}
