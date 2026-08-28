'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Nfc, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/types'
import { Confetti } from '@/components/Confetti'

type ScanState = 'idle' | 'scanning' | 'not_supported' | 'success' | 'error'

interface TapResult {
  restaurant_name: string | null
  reward: string | null
  card: { current_stamps: number; total_stamps_required: number; is_completed: boolean } | null
}

// Web NFC (NDEFReader) deckt Android/Chrome ab. iOS braucht das native
// Capacitor-Plugin (Core NFC) - sobald das im App-Build steckt, wird es hier
// bevorzugt genutzt; bis dahin zeigt iOS den "not_supported"-Hinweis.
type NDEFReadingEvent = { serialNumber?: string }
type NDEFReaderCtor = new () => {
  scan: () => Promise<void>
  addEventListener: (type: 'reading', cb: (ev: NDEFReadingEvent) => void) => void
}

function StempelInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('restaurant') ?? ''
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<TapResult | null>(null)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const scanningRef = useRef(false)

  useEffect(() => {
    if (!slug) return
    supabase.from('restaurants').select('*').eq('slug', slug).single()
      .then(({ data }) => { if (data) setRestaurant(data as Restaurant) })
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitTag = async (tagUid: string) => {
    try {
      const res = await fetch('/api/nfc/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_uid: tagUid }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'cooldown') {
          toast.error(`Schon gestempelt! Nächster Stempel in bis zu ${data.cooldownHours}h möglich.`)
        } else if (data.error === 'unknown_tag') {
          toast.error('Dieser Tag ist nicht registriert.')
        } else if (data.error === 'card_already_complete') {
          toast.error('Deine Karte ist schon voll — löse deine Belohnung ein!')
        } else {
          toast.error('Fehler beim Stempeln')
        }
        setState('error')
        return
      }
      setResult(data)
      setState('success')
      setConfettiTrigger(t => t + 1)
    } catch {
      toast.error('Fehler beim Stempeln')
      setState('error')
    }
  }

  const startScan = async () => {
    const native = (window as unknown as {
      Capacitor?: { Plugins?: { NfcStamp?: { scan: () => Promise<{ uid: string }> } } }
    }).Capacitor?.Plugins?.NfcStamp

    if (native) {
      setState('scanning')
      try {
        const { uid } = await native.scan()
        await submitTag(uid)
      } catch {
        setState('idle')
      }
      return
    }

    const NDEFReaderCls = (window as unknown as { NDEFReader?: NDEFReaderCtor }).NDEFReader
    if (!NDEFReaderCls) {
      setState('not_supported')
      return
    }

    try {
      setState('scanning')
      scanningRef.current = true
      const reader = new NDEFReaderCls()
      await reader.scan()
      reader.addEventListener('reading', (ev) => {
        if (!scanningRef.current || !ev.serialNumber) return
        scanningRef.current = false
        submitTag(ev.serialNumber.replace(/:/g, '').toUpperCase())
      })
    } catch {
      setState('not_supported')
    }
  }

  const reset = () => {
    setState('idle')
    setResult(null)
    scanningRef.current = false
  }

  if (state === 'success' && result) {
    const card = result.card
    const percent = card ? Math.min(100, (card.current_stamps / card.total_stamps_required) * 100) : 0
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#1C1F1A] to-[#2d5a27] flex flex-col items-center justify-center text-center px-8 gap-6">
        <Confetti trigger={confettiTrigger} />
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center" style={{ boxShadow: '0 0 0 12px rgba(139,176,106,0.15)' }}>
          <CheckCircle className="w-14 h-14 text-[#8BB06A]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {card?.is_completed ? 'Karte voll! 🎉' : 'Gestempelt! ✨'}
          </h1>
          <p className="text-white/70 text-sm">
            {card?.is_completed
              ? `Deine Belohnung: ${result.reward ?? 'frag im Restaurant nach'}`
              : `${card?.current_stamps ?? 1} von ${card?.total_stamps_required ?? 8} Stempeln`}
          </p>
        </div>
        {card && (
          <div className="w-full max-w-xs bg-white/10 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-[#8BB06A] transition-all duration-700" style={{ width: `${percent}%` }} />
          </div>
        )}
        <button onClick={() => router.push('/profil')} className="mt-2 gradient-primary text-white font-bold px-8 py-3 rounded-2xl text-base">
          Zurück zur App
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1C1F1A] to-[#2d5a27] flex flex-col items-center justify-center text-center px-8 gap-6">
      <button onClick={() => router.back()} className="absolute top-6 left-5 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
        <X className="w-5 h-5" />
      </button>

      {restaurant && (
        <p className="text-white/60 text-sm">{restaurant.name}</p>
      )}

      <div
        className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 ${state === 'scanning' ? 'scale-110' : ''}`}
        style={{
          background: 'rgba(139,176,106,0.15)',
          boxShadow: state === 'scanning' ? '0 0 0 16px rgba(139,176,106,0.15), 0 0 0 32px rgba(139,176,106,0.08)' : '0 0 0 0 rgba(139,176,106,0)',
        }}
      >
        <Nfc className={`w-14 h-14 text-[#8BB06A] ${state === 'scanning' ? 'animate-pulse' : ''}`} />
      </div>

      {state === 'not_supported' ? (
        <div className="max-w-xs">
          <div className="flex items-center justify-center gap-2 text-amber-300 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="font-semibold text-sm">NFC noch nicht verfügbar</p>
          </div>
          <p className="text-white/60 text-xs leading-relaxed">
            Auf diesem Gerät funktioniert das automatische Stempeln noch nicht — frag im Restaurant nach einem manuellen Stempel.
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {state === 'scanning' ? 'Halte dein Handy an den Tag…' : 'Stempel per Antippen'}
          </h1>
          <p className="text-white/60 text-sm max-w-xs">
            {state === 'scanning'
              ? 'Bleib nah dran, bis der Stempel bestätigt wird.'
              : 'Halte dein Handy an den NFC-Tag im Restaurant, um automatisch einen Stempel zu sammeln.'}
          </p>
        </div>
      )}

      {state === 'error' && (
        <button onClick={reset} className="text-white/60 text-xs underline">Nochmal versuchen</button>
      )}

      {(state === 'idle' || state === 'error') && (
        <button onClick={startScan} className="gradient-primary text-white font-bold px-8 py-3.5 rounded-2xl text-base">
          Scan starten
        </button>
      )}
    </div>
  )
}

export default function StempelPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <StempelInner />
    </Suspense>
  )
}
