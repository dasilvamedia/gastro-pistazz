'use client'

import { useEffect, useState, Suspense } from 'react'

// Bruecke fuer den nativen OAuth-Ruecksprung. Supabase darf nicht direkt auf
// io.pistazz.gastro:// redirecten - iOS blockiert Custom-Scheme-Weiterleitungen
// in automatischen 302-Ketten stillschweigend. Stattdessen landet der Login
// hier (normale https-Seite, laedt ueberall) und wird verteilt:
// - Im App-WebView (window.Capacitor): direkt weiter zu /auth/callback -
//   gleicher Browser-Kontext, PKCE-Verifier vorhanden, App nie verlassen.
// - In Safari: Scheme-Sprung in die App. Der automatische Versuch klappt
//   meist; falls iOS ihn blockt, bleibt der Button - ein echter Tap wird
//   immer respektiert.
function NativeBridgeInner() {
  const [showButton, setShowButton] = useState(false)
  const [schemeUrl, setSchemeUrl] = useState('')

  useEffect(() => {
    const qs = window.location.search // ?code=...&restaurant=...
    const isNative = !!(window as unknown as { Capacitor?: unknown }).Capacitor

    if (isNative) {
      window.location.replace('/auth/callback' + qs)
      return
    }

    const target = 'io.pistazz.gastro://auth-callback' + qs
    setSchemeUrl(target)
    window.location.href = target
    // Wenn wir nach kurzer Zeit noch hier sind, hat iOS den automatischen
    // Sprung geblockt - Button anzeigen.
    const t = setTimeout(() => setShowButton(true), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5 text-center max-w-sm">
        {showButton ? (
          <>
            <p className="text-[#1C1F1A] font-semibold text-lg">Anmeldung erfolgreich! 🎉</p>
            <p className="text-[#1C1F1A]/60 text-sm">Tippe hier, um zurück in die App zu gelangen:</p>
            <a
              href={schemeUrl}
              className="w-full gradient-primary bg-[#6D9450] text-white font-semibold py-3.5 px-8 rounded-xl"
            >
              Weiter in der Pistazz-App
            </a>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-[#8BB06A] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#1C1F1A]/60 text-sm">Zurück zur App…</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function NativeBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#EEF5E6] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#8BB06A] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NativeBridgeInner />
    </Suspense>
  )
}
