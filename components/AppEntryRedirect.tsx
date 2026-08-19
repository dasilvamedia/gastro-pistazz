'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// In der nativen App (Capacitor) ist die Landing Page nicht das Ziel:
// Wer die App laedt, will die App erleben - direkt in die Gast-Ansicht.
export function AppEntryRedirect() {
  const router = useRouter()
  useEffect(() => {
    const w = window as unknown as { Capacitor?: unknown }
    if (w.Capacitor) router.replace('/home')
  }, [router])
  return null
}
