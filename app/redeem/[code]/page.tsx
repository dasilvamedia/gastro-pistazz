'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Gift, Star, Clock, User, ArrowRight } from 'lucide-react'
import { Confetti } from '@/components/Confetti'

// Restaurant-Seite: Personal scannt den QR-Code des Gastes (oeffnet per
// Universal Link direkt in der App) oder tippt den Code ein. Vorschau ->
// "Einloesung bestaetigen" -> Konfetti. Jeder Fehlerfall hat einen klaren
// deutschen Zustand, nie eine leere Fehlermeldung.

type Preview = {
  kind: 'deal' | 'stamp'
  code: string
  title: string
  guest_name: string | null
  restaurant_name: string | null
  status: string
  expires_at: string | null
  points_spent: number
  reward: string | null
}

type State =
  | { phase: 'loading' }
  | { phase: 'preview'; preview: Preview }
  | { phase: 'confirming'; preview: Preview }
  | { phase: 'done'; preview: Preview }
  | { phase: 'guest' }
  | { phase: 'error'; title: string; text: string; code?: string }

export default function RedeemCodePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [state, setState] = useState<State>({ phase: 'loading' })
  const [confetti, setConfetti] = useState(0)

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/deals/redeem/confirm?code=${encodeURIComponent(code)}`)
      if (res.status === 401) {
        router.replace(`/restaurant-login?next=${encodeURIComponent(`/redeem/${code}`)}`)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data.code === 'not_staff') { setState({ phase: 'guest' }); return }
      if (!res.ok) {
        setState({ phase: 'error', title: titleFor(data.code), text: data.error ?? 'Unbekannter Fehler.', code: data.code })
        return
      }
      const preview = data.preview as Preview
      if (preview.status === 'used') {
        setState({ phase: 'error', title: 'Bereits eingeloest', text: 'Dieser Code wurde schon bestaetigt.', code: 'already_used' })
        return
      }
      if (preview.status === 'expired' || preview.status === 'cancelled') {
        setState({ phase: 'error', title: 'Code abgelaufen', text: 'Der Gast hat seine Punkte automatisch zurueckbekommen und kann den Deal neu einloesen.', code: 'expired' })
        return
      }
      setState({ phase: 'preview', preview })
    }
    run().catch(() => setState({ phase: 'error', title: 'Verbindungsfehler', text: 'Bitte erneut versuchen.' }))
  }, [code, router])

  const confirm = async () => {
    if (state.phase !== 'preview') return
    const preview = state.preview
    setState({ phase: 'confirming', preview })
    const res = await fetch('/api/deals/redeem/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setState({ phase: 'error', title: titleFor(data.code), text: data.error ?? 'Unbekannter Fehler.', code: data.code })
      return
    }
    setState({ phase: 'done', preview })
    setConfetti(c => c + 1)
  }

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex flex-col items-center justify-center px-6 py-10">
      <Confetti trigger={confetti} />
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-[#D4E8C2] p-6">
        <p className="text-center text-xs font-semibold tracking-widest text-[#6D9450] mb-4">PISTAZZ EINLOESUNG</p>

        {state.phase === 'loading' && (
          <div className="space-y-3">
            <div className="skeleton h-6 w-2/3 rounded mx-auto" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-12 w-full rounded-2xl mt-4" />
          </div>
        )}

        {state.phase === 'guest' && (
          <div className="text-center">
            <User size={40} className="mx-auto text-[#8BB06A] mb-3" />
            <h1 className="text-xl font-bold text-[#1C1F1A] mb-2">Diese Seite ist fuer Restaurants</h1>
            <p className="text-[#6D9450] text-sm">Zeige deinen Code dem Personal. Das Restaurant bestaetigt ihn hier.</p>
            <button onClick={() => router.push('/deals')} className="mt-6 w-full gradient-primary text-white font-bold py-3 rounded-2xl">
              Zu meinen Deals
            </button>
          </div>
        )}

        {(state.phase === 'preview' || state.phase === 'confirming') && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF5E6] flex items-center justify-center">
                {state.preview.kind === 'deal' ? <Gift className="text-[#6D9450]" /> : <Star className="text-[#E5B84C]" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6D9450]">{state.preview.kind === 'deal' ? 'Deal' : 'Stempel-Belohnung'}</p>
                <h1 className="text-lg font-bold text-[#1C1F1A] truncate">{state.preview.title}</h1>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-5">
              <Row label="Gast" value={state.preview.guest_name ?? 'Unbekannt'} />
              {state.preview.kind === 'deal' && state.preview.points_spent > 0 && (
                <Row label="Eingesetzte Punkte" value={`${state.preview.points_spent}`} />
              )}
              {state.preview.kind === 'stamp' && state.preview.reward && (
                <Row label="Belohnung" value={state.preview.reward} />
              )}
              {state.preview.expires_at && (
                <Row label="Gueltig bis" value={new Date(state.preview.expires_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} icon={<Clock size={14} />} />
              )}
              <Row label="Code" value={state.preview.code} mono />
            </div>

            <button
              onClick={confirm}
              disabled={state.phase === 'confirming'}
              className="w-full gradient-primary text-white font-bold py-4 rounded-2xl text-base shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {state.phase === 'confirming' ? 'Wird bestaetigt...' : 'Einloesung bestaetigen'}
              {state.phase === 'preview' && <ArrowRight size={18} />}
            </button>
            <p className="text-center text-[#6D9450] text-xs mt-3">
              Der Gast sieht die Bestaetigung sofort auf seinem Handy.
            </p>
          </>
        )}

        {state.phase === 'done' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[#EEF5E6] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={44} className="text-[#6D9450]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1C1F1A] mb-1">Eingeloest</h1>
            <p className="text-[#6D9450] text-sm mb-1">{state.preview.title}</p>
            {state.preview.guest_name && <p className="text-[#1C1F1A] text-sm">fuer {state.preview.guest_name}</p>}
            {state.preview.kind === 'stamp' && (
              <p className="text-[#6D9450] text-xs mt-2">Die Stempelkarte des Gastes startet jetzt neu bei 0.</p>
            )}
            <button onClick={() => router.push('/dashboard/einloesen')} className="mt-6 w-full gradient-primary text-white font-bold py-3 rounded-2xl">
              Fertig
            </button>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={32} className="text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-[#1C1F1A] mb-2">{state.title}</h1>
            <p className="text-[#6D9450] text-sm">{state.text}</p>
            <button onClick={() => router.push('/dashboard/einloesen')} className="mt-6 w-full bg-[#EEF5E6] text-[#577A3D] font-bold py-3 rounded-2xl">
              Zur Einloesen-Seite
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function titleFor(code?: string) {
  switch (code) {
    case 'code_not_found': return 'Code nicht gefunden'
    case 'wrong_restaurant': return 'Falsches Restaurant'
    case 'already_used': return 'Bereits eingeloest'
    case 'expired': return 'Code abgelaufen'
    default: return 'Das hat nicht geklappt'
  }
}

function Row({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#F8FAF5] rounded-xl px-3 py-2">
      <span className="text-[#6D9450] flex items-center gap-1.5">{icon}{label}</span>
      <span className={`text-[#1C1F1A] font-semibold truncate ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</span>
    </div>
  )
}
