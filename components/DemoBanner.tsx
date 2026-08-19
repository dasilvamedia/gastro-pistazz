'use client'

import { useRouter } from 'next/navigation'

// Demo-Hinweis fuer nicht angemeldete App-Nutzer:
// Alles ansehen ist erlaubt, mitmachen erst nach Anmeldung.
export function DemoBanner() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push('/register')}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-[#1C1F1A] active:opacity-90"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
    >
      <span className="text-white/85 text-[13px] text-left leading-snug">
        <strong className="text-white">Demo-Ansicht</strong> · Schau dich um! Zum Punktesammeln kurz anmelden
      </span>
      <span className="shrink-0 bg-[#8BB06A] text-white text-xs font-bold px-3 py-1.5 rounded-full">
        Jetzt starten
      </span>
    </button>
  )
}
