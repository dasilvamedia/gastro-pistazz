'use client'

import { useEffect } from 'react'

// OAuth-Ruecksprung in der nativen App: Der Google-/Apple-Login laeuft im
// System-Browser (Google blockiert Logins in eingebetteten WebViews), die
// Rueckkehr erfolgt per Custom-URL-Scheme io.pistazz.gastro://auth-callback.
// Safari und die App teilen sich keinen Storage - der PKCE-Verifier liegt
// nur im App-WebView. Deshalb reichen wir den ?code=... hier an die
// bestehende /auth/callback-Seite weiter, wo supabase-js (detectSessionInUrl)
// ihn mit dem lokal gespeicherten Verifier gegen die Session eintauscht.
export default function NativeAuthHandler() {
  useEffect(() => {
    const w = window as unknown as { Capacitor?: unknown }
    if (!w.Capacitor) return

    let remove: (() => void) | undefined
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => {
        if (!url.startsWith('io.pistazz.gastro://auth-callback')) return
        const qs = url.split('?')[1] ?? ''
        // Voller Reload statt Router-Push, damit der Supabase-Client die
        // Code-Erkennung beim Seitenaufbau sicher ausfuehrt.
        window.location.href = '/auth/callback' + (qs ? `?${qs}` : '')
      }).then((handle) => {
        remove = () => { handle.remove() }
      })
    })
    return () => { remove?.() }
  }, [])

  return null
}
