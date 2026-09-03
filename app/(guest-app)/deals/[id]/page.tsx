'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Deal } from '@/types'
import { TRIGGER_CONFIG } from '@/types'
import { MOCK_DEALS, IS_MOCK_MODE } from '@/lib/mock-data'
import { RedemptionModal } from '@/components/guest/RedemptionModal'

type ActiveCode = { id: string; code: string; expiresAt: Date }

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  // Bereits laufender Code fuer diesen Deal (sonst wuerde ein zweiter Tap
  // mit "bereits eingeloest" scheitern und wie ein Fehler wirken)
  const [existing, setExisting] = useState<ActiveCode | null>(null)
  const [modal, setModal] = useState<ActiveCode | null>(null)
  // Punkte-Guthaben des Gastes bei DIESEM Restaurant (fuer restriktive Restaurants)
  const [ownPoints, setOwnPoints] = useState<number | null>(null)

  const loadExisting = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('deal_redemptions')
      .select('id, redemption_code, expires_at')
      .eq('deal_id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('redeemed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setExisting(data ? { id: data.id, code: data.redemption_code, expiresAt: new Date(data.expires_at) } : null)
  }

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
        // Guthaben bei diesem Restaurant laden (fuer die Anzeige, wenn nur
        // eigene Punkte akzeptiert werden)
        const { data: { user } } = await supabase.auth.getUser()
        if (user && data?.restaurant_id) {
          const { data: wallet } = await supabase
            .from('guest_points').select('balance')
            .eq('user_id', user.id).eq('restaurant_id', data.restaurant_id).maybeSingle()
          setOwnPoints(wallet?.balance ?? 0)
        }
        await loadExisting()
      } catch {
        toast.error('Deal nicht gefunden')
        router.back()
      } finally {
        setLoading(false)
      }
    }
    load()

    if (!IS_MOCK_MODE) {
      const channel = supabase
        .channel(`deal-detail-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals', filter: `id=eq.${id}` },
          async () => {
            const { data } = await supabase.from('deals').select('*, restaurant:restaurants(*)').eq('id', id).single()
            if (data) setDeal(data)
          })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleRedeem = async () => {
    if (!deal) return
    if (existing) { setModal(existing); return }
    setRedeeming(true)
    try {
      const res = await fetch('/api/deals/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'user_limit_reached') await loadExisting()
        throw new Error(data.error ?? 'Fehler beim Einloesen')
      }
      const active = { id: data.redemption_id, code: data.redemption_code, expiresAt: new Date(data.expires_at) }
      setExisting(active)
      setModal(active)
      if (data.points_spent > 0) {
        toast.success(`${data.points_spent} Punkte eingesetzt. Neuer Stand: ${data.available_points}`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fehler beim Einloesen')
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
  const restrictsPoints = (deal.restaurant as any)?.accept_foreign_points === false
  const notEnoughOwn = restrictsPoints && deal.points_required > 0 && ownPoints != null && ownPoints < deal.points_required

  return (
    <>
      <div className="min-h-screen bg-[#EEF5E6] pb-24">
        <div
          className="relative h-56 w-full flex items-end p-4 overflow-hidden"
          style={!deal.image_url ? {
            background: `linear-gradient(135deg, ${deal.badge_color || '#8BB06A'}aa, ${deal.badge_color || '#6D9450'})`,
          } : undefined}
        >
          {deal.image_url && (
            <img src={deal.image_url} alt={deal.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/25" />
          <button
            onClick={() => router.back()}
            className="absolute top-12 left-4 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center z-10"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          {deal.badge_text && (
            <span className="relative z-10 bg-[#E5B84C] text-[#1C1F1A] text-sm font-bold px-3 py-1 rounded-full">
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
                {deal.restaurant.name}
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
                  <p className="text-[#1C1F1A] font-semibold text-sm">Punkte benoetigt</p>
                  <p className="text-[#6D9450] text-sm">{deal.points_required} Punkte</p>
                </div>
              </div>
            )}
            {deal.valid_until && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-[#1C1F1A] font-semibold text-sm">Gueltig bis</p>
                  <p className="text-[#6D9450] text-sm">
                    {new Date(deal.valid_until).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {restrictsPoints && deal.points_required > 0 && (
            <div className="bg-white rounded-2xl p-3 border border-[#EEF5E6] text-sm">
              <p className="text-[#1C1F1A]">
                Dieses Restaurant akzeptiert nur hier gesammelte Punkte.
              </p>
              {ownPoints != null && (
                <p className="text-[#6D9450] mt-0.5">
                  Dein Guthaben hier: <span className="font-bold">{ownPoints}</span> von {deal.points_required} Punkten
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleRedeem}
            disabled={redeeming || notEnoughOwn}
            className="w-full gradient-primary text-white font-bold py-4 rounded-2xl text-lg shadow-lg disabled:opacity-60"
          >
            {redeeming ? 'Wird eingeloest...' : existing ? 'Code anzeigen' : notEnoughOwn ? 'Noch nicht genug Punkte hier' : 'Deal einloesen'}
          </button>
          {existing && (
            <p className="text-center text-[#6D9450] text-xs">
              Du hast einen laufenden Code fuer diesen Deal. Zeige ihn dem Personal.
            </p>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {modal && (
          <RedemptionModal
            kind="deal"
            title={deal.title}
            code={modal.code}
            expiresAt={modal.expiresAt}
            redemptionId={modal.id}
            onClose={() => setModal(null)}
            onRedeemed={() => setExisting(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
