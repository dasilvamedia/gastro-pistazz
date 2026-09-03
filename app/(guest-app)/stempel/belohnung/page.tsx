'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { X, Star, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Confetti } from '@/components/Confetti'

// Gratulation: Karte voll. Zeigt QR + Code der Belohnung, wartet live auf
// die Bestaetigung durch das Restaurant und feiert dann ein zweites Mal.

type Card = {
  id: string; current_stamps: number; total_stamps_required: number
  is_completed: boolean; reward_redeemed: boolean; reward_code: string | null; completed_count: number
}
type RestaurantInfo = { id: string; name: string; slug: string; stamp_card_reward: string | null; primary_color: string | null }

function BelohnungInner() {
  const router = useRouter()
  const slug = useSearchParams().get('restaurant') ?? ''
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'redeemed' | 'none'>('loading')
  const [confetti, setConfetti] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!slug) { setState('none'); return }
    fetch(`/api/stamp-cards?restaurant=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) { setState('none'); return }
        setRestaurant(json.restaurant)
        const c = json.card as Card | null
        if (!c || !c.is_completed || c.reward_redeemed) {
          router.replace(`/stempel?restaurant=${encodeURIComponent(slug)}`)
          return
        }
        setCard(c)
        setState('ready')
        setConfetti(1)
      })
      .catch(() => setState('none'))
  }, [slug, router])

  // Live warten, bis das Restaurant bestaetigt (Karte springt auf 0)
  useEffect(() => {
    if (state !== 'ready' || !card) return
    const done = (row: Record<string, unknown>) =>
      row.is_completed === false && Number(row.current_stamps ?? 1) === 0
    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      setState('redeemed')
      setConfetti(c => c + 1)
    }
    const channel = supabase
      .channel(`stamp-reward-${card.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stamp_cards', filter: `id=eq.${card.id}` },
        payload => { if (done(payload.new as Record<string, unknown>)) finish() })
      .subscribe()
    const poll = setInterval(async () => {
      const { data } = await supabase.from('stamp_cards').select('is_completed, current_stamps').eq('id', card.id).maybeSingle()
      if (data && done(data as unknown as Record<string, unknown>)) finish()
    }, 5000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, card?.id])

  const accent = restaurant?.primary_color || '#8BB06A'

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1C1F1A] to-[#2d5a27] flex flex-col items-center justify-center text-center px-6 gap-5 overflow-y-auto py-10">
      <Confetti trigger={confetti} />
      <button onClick={() => router.push(restaurant ? `/restaurant/${restaurant.id}` : '/home')} className="absolute top-6 left-5 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
        <X className="w-5 h-5" />
      </button>

      {state === 'loading' && <p className="text-white/60 text-sm">Lade deine Belohnung ...</p>}

      {state === 'none' && (
        <>
          <p className="text-white text-lg font-semibold">Keine offene Belohnung</p>
          <button onClick={() => router.push('/home')} className="gradient-primary text-white font-bold px-8 py-3 rounded-2xl">Zur App</button>
        </>
      )}

      {state === 'ready' && card && (
        <>
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center" style={{ boxShadow: `0 0 0 12px ${accent}26` }}>
            <Star className="w-11 h-11" style={{ color: '#E5B84C' }} />
          </div>
          <div>
            <p className="text-white/60 text-sm mb-1">{restaurant?.name}</p>
            <h1 className="text-3xl font-bold text-white mb-2">Karte voll! Gratulation</h1>
            <p className="text-white/80 text-base">
              Deine Belohnung: <span className="font-semibold text-white">{restaurant?.stamp_card_reward ?? 'frag im Restaurant nach'}</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-3xl shadow-xl">
            <QRCodeSVG value={`https://gastro.pistazz.io/redeem/${card.reward_code}`} size={190} fgColor="#1C1F1A" />
          </div>
          <div className="bg-white/10 rounded-2xl px-6 py-3">
            <p className="text-white/60 text-xs mb-1">Dein Code</p>
            <p className="text-white text-2xl font-bold tracking-widest font-mono" data-copyable="true">{card.reward_code}</p>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#8BB06A] animate-pulse" />
            Zeige den Code dem Personal. Die Bestaetigung erscheint hier.
          </div>
        </>
      )}

      {state === 'redeemed' && (
        <>
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center" style={{ boxShadow: '0 0 0 12px rgba(139,176,106,0.15)' }}>
            <CheckCircle2 className="w-14 h-14 text-[#8BB06A]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Eingeloest!</h1>
            <p className="text-white/70 text-sm">
              {restaurant?.stamp_card_reward ?? 'Deine Belohnung'} ist deins. Deine neue Stempelkarte hat begonnen.
            </p>
          </div>
          <button onClick={() => router.push(restaurant ? `/restaurant/${restaurant.id}` : '/home')} className="gradient-primary text-white font-bold px-8 py-3 rounded-2xl">
            Zurueck zum Restaurant
          </button>
        </>
      )}
    </div>
  )
}

export default function BelohnungPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <BelohnungInner />
    </Suspense>
  )
}
