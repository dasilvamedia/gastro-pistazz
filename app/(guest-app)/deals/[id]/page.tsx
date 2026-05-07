'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, X, AlertTriangle, Clock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Deal } from '@/types'
import { TRIGGER_CONFIG, RESTAURANT_TYPE_LABELS } from '@/types'
import { MOCK_DEALS, IS_MOCK_MODE } from '@/lib/mock-data'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function RedemptionModal({
  deal,
  code,
  expiresAt,
  onClose,
}: {
  deal: Deal
  code: string
  expiresAt: Date
  onClose: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [secondsLeft])

  const qrValue = `https://app.pistazz.io/redeem/${code}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-white rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1C1F1A]">Deal einlösen</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#EEF5E6] flex items-center justify-center">
            <X size={16} className="text-[#6D9450]" />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-bold text-sm mb-1">Wichtig! ⚠️</p>
            <p className="text-amber-700 text-sm">
              Sage dem Kellner VOR dem Bestellen Bescheid, dass du diesen Deal nutzen möchtest.
            </p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-2xl shadow border border-[#EEF5E6]">
            <QRCodeSVG value={qrValue} size={180} fgColor="#1C1F1A" />
          </div>
        </div>

        {/* Code */}
        <div className="bg-[#EEF5E6] rounded-2xl p-4 text-center mb-4">
          <p className="text-[#6D9450] text-xs mb-1">Dein Code</p>
          <p className="text-[#1C1F1A] text-2xl font-bold tracking-widest font-mono">{code}</p>
        </div>

        {/* Timer */}
        <div className={`flex items-center justify-center gap-2 mb-4 ${secondsLeft < 60 ? 'text-[#E86B5A]' : 'text-[#6D9450]'}`}>
          <Clock size={16} />
          <span className="font-bold">{formatTime(secondsLeft)}</span>
          <span className="text-sm">verbleibend</span>
        </div>

        {/* Status */}
        <div className={`flex items-center justify-center gap-2 py-3 rounded-2xl ${
          secondsLeft > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}>
          <span className="font-semibold text-sm">
            {secondsLeft > 0 ? 'Deal ist aktiv ✅' : 'Deal abgelaufen ❌'}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  const [modal, setModal] = useState<{ code: string; expiresAt: Date } | null>(null)

  useEffect(() => {
    const load = async () => {
      if (IS_MOCK_MODE) {
        setDeal(MOCK_DEALS.find(d => d.id === id) ?? MOCK_DEALS[0])
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('deals')
          .select('*, restaurant:restaurants(*)')
          .eq('id', id)
          .single()
        if (error) throw error
        setDeal(data)
      } catch {
        toast.error('Deal nicht gefunden')
        router.back()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleRedeem = async () => {
    if (!deal) return
    setRedeeming(true)
    try {
      const res = await fetch('/api/deals/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Fehler beim Einlösen')
      }
      const data = await res.json()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      setModal({ code: data.redemption_code, expiresAt })
    } catch (e: any) {
      toast.error(e.message ?? 'Fehler beim Einlösen')
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF5E6] pb-24">
        <div className="skeleton h-48 w-full rounded-b-3xl" />
        <div className="px-5 pt-5 space-y-3">
          <div className="skeleton h-6 w-2/3 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
        </div>
      </div>
    )
  }

  if (!deal) return null

  const trigger = TRIGGER_CONFIG[deal.trigger]

  return (
    <>
      <div className="min-h-screen bg-[#EEF5E6] pb-24">
        {/* Header image */}
        <div
          className="relative h-52 w-full flex items-end p-4"
          style={{
            background: `linear-gradient(135deg, ${deal.badge_color || '#8BB06A'}aa, ${deal.badge_color || '#6D9450'})`,
          }}
        >
          <button
            onClick={() => router.back()}
            className="absolute top-12 left-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          {deal.badge_text && (
            <span className="bg-[#E5B84C] text-[#1C1F1A] text-sm font-bold px-3 py-1 rounded-full">
              {deal.badge_text}
            </span>
          )}
        </div>

        <div className="px-5 pt-5 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1C1F1A] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {deal.title}
            </h1>
            {deal.restaurant && (
              <button
                onClick={() => router.push(`/restaurant/${deal.restaurant_id}`)}
                className="text-[#6D9450] font-medium text-sm underline"
              >
                {(deal.restaurant as any).name}
              </button>
            )}
          </div>

          {deal.description && (
            <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6]">
              <h2 className="text-[#1C1F1A] font-bold mb-2">Beschreibung</h2>
              <p className="text-[#6D9450] text-sm leading-relaxed">{deal.description}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6] space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{trigger.emoji}</span>
              <div>
                <p className="text-[#1C1F1A] font-semibold text-sm">Aktion erforderlich</p>
                <p className="text-[#6D9450] text-sm">{trigger.label}</p>
              </div>
            </div>
            {deal.points_required > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-[#1C1F1A] font-semibold text-sm">Punkte benötigt</p>
                  <p className="text-[#6D9450] text-sm">{deal.points_required} Punkte</p>
                </div>
              </div>
            )}
            {deal.valid_until && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-[#1C1F1A] font-semibold text-sm">Gültig bis</p>
                  <p className="text-[#6D9450] text-sm">
                    {new Date(deal.valid_until).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleRedeem}
            disabled={redeeming}
            className="w-full gradient-primary text-white font-bold py-4 rounded-2xl text-lg shadow-lg disabled:opacity-60"
          >
            {redeeming ? 'Wird eingelöst...' : 'Deal einlösen 💳'}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {modal && (
          <RedemptionModal
            deal={deal}
            code={modal.code}
            expiresAt={modal.expiresAt}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
