'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, AlertTriangle, Clock, CheckCircle2, Hourglass } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { Confetti } from '@/components/Confetti'

export type RedemptionModalProps = {
  kind: 'deal' | 'stamp'
  title: string
  code: string
  /** Deal-Codes laufen ab, Stempel-Belohnungen nicht */
  expiresAt?: Date | null
  rewardText?: string | null
  /** deal_redemptions.id (kind deal) */
  redemptionId?: string | null
  /** stamp_cards.id (kind stamp) */
  stampCardId?: string | null
  onClose: () => void
  onRedeemed?: () => void
}

type Phase = 'active' | 'redeemed' | 'expired'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Gast zeigt QR + Code, das Restaurant bestaetigt. Der Screen wartet live
// auf die Bestaetigung (Realtime auf die eigene Zeile + 5-s-Polling als
// Fallback) und feiert mit Konfetti. Der Timer kommt immer aus expires_at
// des Servers, nie aus einer eigenen Konstante.
export function RedemptionModal({
  kind, title, code, expiresAt, rewardText, redemptionId, stampCardId, onClose, onRedeemed,
}: RedemptionModalProps) {
  const supabase = createClient()
  const [phase, setPhase] = useState<Phase>('active')
  const [confetti, setConfetti] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : -1
  )
  const redeemedRef = useRef(false)

  const markRedeemed = () => {
    if (redeemedRef.current) return
    redeemedRef.current = true
    setPhase('redeemed')
    setConfetti(c => c + 1)
    onRedeemed?.()
  }

  // Timer (nur Deal)
  useEffect(() => {
    if (!expiresAt || phase !== 'active') return
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0) {
        setPhase('expired')
        // Lazy-Refund serverseitig anstossen, damit die Punkte sofort zurueck sind
        fetch('/api/deals/redemptions').catch(() => {})
      }
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt, phase])

  // Live auf Bestaetigung warten
  useEffect(() => {
    if (phase !== 'active') return
    const table = kind === 'deal' ? 'deal_redemptions' : 'stamp_cards'
    const rowId = kind === 'deal' ? redemptionId : stampCardId
    if (!rowId) return

    const isDone = (row: Record<string, unknown>) =>
      kind === 'deal'
        ? row.status === 'used'
        : row.is_completed === false && Number(row.current_stamps ?? 1) === 0

    const channel = supabase
      .channel(`redeem-${rowId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${rowId}` },
        (payload) => { if (isDone(payload.new as Record<string, unknown>)) markRedeemed() })
      .subscribe()

    const poll = setInterval(async () => {
      const cols = kind === 'deal' ? 'status' : 'is_completed, current_stamps'
      const { data } = await supabase.from(table).select(cols).eq('id', rowId).maybeSingle()
      if (data && isDone(data as unknown as Record<string, unknown>)) markRedeemed()
    }, 5000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, redemptionId, stampCardId, phase])

  const qrValue = `https://gastro.pistazz.io/redeem/${code}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}
    >
      <Confetti trigger={confetti} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-white rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1C1F1A]">
            {kind === 'deal' ? 'Deal einloesen' : 'Belohnung einloesen'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#EEF5E6] flex items-center justify-center">
            <X size={16} className="text-[#6D9450]" />
          </button>
        </div>

        {phase === 'redeemed' ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-[#EEF5E6] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={44} className="text-[#6D9450]" />
            </div>
            <h3 className="text-2xl font-bold text-[#1C1F1A] mb-2">Eingeloest!</h3>
            <p className="text-[#6D9450] text-sm">
              {kind === 'deal'
                ? `${title}. Viel Spass!`
                : `${rewardText ?? 'Deine Belohnung'} ist deins. Deine neue Stempelkarte hat begonnen.`}
            </p>
            <button onClick={onClose} className="mt-6 gradient-primary text-white font-bold px-8 py-3 rounded-2xl">
              Fertig
            </button>
          </div>
        ) : phase === 'expired' ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Hourglass size={40} className="text-[#E86B5A]" />
            </div>
            <h3 className="text-2xl font-bold text-[#1C1F1A] mb-2">Code abgelaufen</h3>
            <p className="text-[#6D9450] text-sm">
              Deine Punkte wurden dir gutgeschrieben. Du kannst den Deal jederzeit neu einloesen.
            </p>
            <button onClick={onClose} className="mt-6 gradient-primary text-white font-bold px-8 py-3 rounded-2xl">
              Verstanden
            </button>
          </div>
        ) : (
          <>
            <p className="text-[#1C1F1A] font-semibold mb-3">{title}</p>
            {rewardText && kind === 'stamp' && (
              <p className="text-[#6D9450] text-sm mb-3">Deine Belohnung: <span className="font-semibold text-[#1C1F1A]">{rewardText}</span></p>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-bold text-sm mb-1">Wichtig</p>
                <p className="text-amber-700 text-sm">
                  Zeige diesen Code dem Personal, am besten vor dem Bestellen. Das Restaurant bestaetigt ihn, danach erscheint hier die Bestaetigung.
                </p>
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-2xl shadow border border-[#EEF5E6]">
                <QRCodeSVG value={qrValue} size={180} fgColor="#1C1F1A" />
              </div>
            </div>

            <div className="bg-[#EEF5E6] rounded-2xl p-4 text-center mb-4">
              <p className="text-[#6D9450] text-xs mb-1">Dein Code</p>
              <p className="text-[#1C1F1A] text-2xl font-bold tracking-widest font-mono" data-copyable="true">{code}</p>
            </div>

            {secondsLeft >= 0 && (
              <div className={`flex items-center justify-center gap-2 mb-4 ${secondsLeft < 60 ? 'text-[#E86B5A]' : 'text-[#6D9450]'}`}>
                <Clock size={16} />
                <span className="font-bold">{formatTime(secondsLeft)}</span>
                <span className="text-sm">verbleibend</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#EEF5E6] text-[#577A3D]">
              <span className="w-2 h-2 rounded-full bg-[#8BB06A] animate-pulse" />
              <span className="font-semibold text-sm">Warte auf Bestaetigung durch das Restaurant</span>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
