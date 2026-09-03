'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Deal, DealRedemption } from '@/types'
import { TIER_CONFIG } from '@/types'
import { MOCK_USER, MOCK_DEALS, IS_MOCK_MODE } from '@/lib/mock-data'
import { RedemptionModal } from '@/components/guest/RedemptionModal'

// Punkte pro Aktion kommen aus den echten Restaurant-Einstellungen: ein
// Wert, wenn alle gleich, sonst "300 bis 750".
const EARN_TYPES = [
  { key: 'points_per_story',         emoji: '📸', label: 'Instagram Story' },
  { key: 'points_per_reel',          emoji: '🎬', label: 'Instagram Reel' },
  { key: 'points_per_post',          emoji: '📱', label: 'Instagram Post' },
  { key: 'points_per_google_review', emoji: '⭐', label: 'Google Bewertung' },
  { key: 'points_per_receipt',       emoji: '🧾', label: 'Beleg hochladen' },
] as const
const EARN_DEFAULTS: Record<string, number> = {
  points_per_story: 500, points_per_reel: 750, points_per_post: 400, points_per_google_review: 300, points_per_receipt: 100,
}

type MyRedemption = DealRedemption & {
  deal: { title: string; image_url: string | null } | null
  restaurant: { name: string; slug: string } | null
}

const TIER_THRESHOLDS: Record<string, { next: string; target: number }> = {
  bronze: { next: 'Silber', target: 1500 },
  silber: { next: 'Gold', target: 5000 },
  gold: { next: 'Platin', target: 10000 },
  platin: { next: '', target: 10000 },
}

const REDEMPTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Code aktiv', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Bestaetigt', color: 'bg-blue-100 text-blue-700' },
  used: { label: 'Eingeloest', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Abgelaufen, Punkte zurueck', color: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Storniert', color: 'bg-gray-100 text-gray-500' },
}

function DealBigCard({ deal }: { deal: Deal }) {
  const router = useRouter()
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#EEF5E6]">
      <div
        className="h-44 w-full relative overflow-hidden flex items-end p-4"
        style={!deal.image_url ? {
          background: `linear-gradient(135deg, ${deal.badge_color || '#8BB06A'}99, ${deal.badge_color || '#6D9450'})`,
        } : undefined}
      >
        {deal.image_url && (
          <img src={deal.image_url} alt={deal.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {deal.badge_text && (
          <span className="relative z-10 bg-[#E5B84C] text-[#1C1F1A] text-xs font-bold px-3 py-1 rounded-full">
            {deal.badge_text}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-[#1C1F1A] font-bold text-xl mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
          {deal.title}
        </h3>
        {deal.description && (
          <p className="text-[#6D9450] text-sm mb-3 line-clamp-2">{deal.description}</p>
        )}
        <button
          onClick={() => router.push(`/deals/${deal.id}`)}
          className="w-full gradient-primary text-white font-bold py-3 rounded-2xl"
        >
          Deal einlösen
        </button>
      </div>
    </div>
  )
}

function SkeletonDeal() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-[#EEF5E6]">
      <div className="skeleton h-36 w-full" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-5 w-2/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-10 w-full rounded-2xl mt-2" />
      </div>
    </div>
  )
}

export default function DealsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [redemptions, setRedemptions] = useState<MyRedemption[]>([])
  const [earnInfo, setEarnInfo] = useState<{ emoji: string; label: string; text: string }[]>(
    EARN_TYPES.map(t => ({ emoji: t.emoji, label: t.label, text: `${EARN_DEFAULTS[t.key]} Punkte` }))
  )
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'available' | 'mine'>('available')
  const [openCode, setOpenCode] = useState<MyRedemption | null>(null)

  const loadRedemptions = async () => {
    const res = await fetch('/api/deals/redemptions')
    if (!res.ok) return
    const json = await res.json()
    setRedemptions((json.redemptions ?? []) as MyRedemption[])
    // Kontostand kann sich durch Rueckerstattungen geaendert haben
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) setProfile(p)
    }
  }

  useEffect(() => {
    const load = async () => {
      if (IS_MOCK_MODE) {
        setProfile(MOCK_USER)
        setDeals(MOCK_DEALS)
        setLoading(false)
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [{ data: p }, { data: d }, { data: pts }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('deals').select('*, restaurant:restaurants(name)').eq('status', 'active'),
          supabase.from('restaurants').select('points_per_story, points_per_reel, points_per_post, points_per_google_review, points_per_receipt').eq('is_active', true),
        ])

        setProfile(p ?? null)
        setDeals(d ?? [])
        if (pts && pts.length > 0) {
          setEarnInfo(EARN_TYPES.map(t => {
            const values = pts.map(r => Number((r as Record<string, number>)[t.key] ?? EARN_DEFAULTS[t.key]))
            const min = Math.min(...values), max = Math.max(...values)
            return { emoji: t.emoji, label: t.label, text: min === max ? `${min} Punkte` : `${min} bis ${max} Punkte` }
          }))
        }
        await loadRedemptions()
      } catch {
        toast.error('Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()

    if (!IS_MOCK_MODE) {
      const refresh = async () => {
        const { data } = await supabase.from('deals').select('*, restaurant:restaurants(name, cover_url, logo_url)').eq('status', 'active')
        if (data) setDeals(data)
      }
      // Broadcast statt postgres_changes auf der ganzen Tabelle (Realtime-Sturm)
      const channel = supabase
        .channel('app-live')
        .on('broadcast', { event: 'deal_updated' }, refresh)
        .on('broadcast', { event: 'restaurant_updated' }, refresh)
        .subscribe()
      const onVisible = () => { if (document.visibilityState === 'visible') { refresh(); loadRedemptions() } }
      document.addEventListener('visibilitychange', onVisible)
      const poll = setInterval(refresh, 120_000)
      return () => { supabase.removeChannel(channel); clearInterval(poll); document.removeEventListener('visibilitychange', onVisible) }
    }
  }, [])

  const tier = profile?.tier ?? 'bronze'
  const tierCfg = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]
  const tierNext = TIER_THRESHOLDS[tier]
  const progress = tierNext?.target
    ? Math.min(((profile?.total_points ?? 0) - tierCfg.minPoints) / (tierNext.target - tierCfg.minPoints) * 100, 100)
    : 100

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      {/* Header */}
      <div
        className="gradient-primary rounded-b-[2rem] pb-6 px-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}
      >
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Deine Deals 💰
        </h1>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-white text-lg font-bold">
            🏆 {profile?.available_points ?? 0} verfügbare Punkte
          </span>
          <span
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: tierCfg.color + '33', color: tierCfg.color === '#E2E8F0' ? '#1C1F1A' : tierCfg.color }}
          >
            {tierCfg.label}
          </span>
        </div>
        {tierNext?.next && (
          <div>
            <div className="flex justify-between text-white/80 text-xs mb-1">
              <span>{tierCfg.label}</span>
              <span>{tierNext.next} ab {tierNext.target.toLocaleString('de')} P</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Earn info */}
        <div className="bg-[#EEF5E6] border border-[#D4E8C2] rounded-2xl p-4">
          <h2 className="text-[#1C1F1A] font-bold mb-3">So sammelst du Punkte</h2>
          <div className="space-y-2">
            {earnInfo.map(e => (
              <div key={e.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{e.emoji}</span>
                  <span className="text-[#1C1F1A] text-sm">{e.label}</span>
                </div>
                <span className="text-[#6D9450] font-bold text-sm">{e.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 border border-[#EEF5E6]">
          {(['available', 'mine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'gradient-primary text-white shadow-sm' : 'text-[#6D9450]'
              }`}
            >
              {t === 'available' ? 'Verfügbare Deals' : 'Meine Deals'}
            </button>
          ))}
        </div>

        {tab === 'available' && (
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonDeal key={i} />)
              : deals.length === 0
              ? <p className="text-center text-[#6D9450] py-8">Keine Deals verfügbar</p>
              : deals.map(d => <DealBigCard key={d.id} deal={d} />)}
          </div>
        )}

        {tab === 'mine' && (
          <div className="space-y-2">
            {redemptions.length === 0
              ? <p className="text-center text-[#6D9450] py-8">Noch keine Deals eingeloest</p>
              : redemptions.map(r => {
                  const statusCfg = REDEMPTION_STATUS_LABELS[r.status] ?? REDEMPTION_STATUS_LABELS.pending
                  const isPending = r.status === 'pending'
                  const when = r.status === 'used' && r.used_at ? r.used_at : r.redeemed_at
                  return (
                    <button
                      key={r.id}
                      onClick={() => isPending && setOpenCode(r)}
                      className={`w-full text-left bg-white rounded-2xl p-3 border flex items-center gap-3 ${isPending ? 'border-[#8BB06A] shadow-sm' : 'border-[#EEF5E6]'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1C1F1A] font-semibold text-sm truncate">{r.deal?.title ?? 'Deal'}</p>
                        <p className="text-[#6D9450] text-xs truncate">
                          {r.restaurant?.name ? `${r.restaurant.name}, ` : ''}
                          {new Date(when).toLocaleDateString('de-DE')}
                          {isPending ? `, Code ${r.redemption_code}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </button>
                  )
                })}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {openCode && openCode.expires_at && (
          <RedemptionModal
            kind="deal"
            title={openCode.deal?.title ?? 'Deal'}
            code={openCode.redemption_code}
            expiresAt={new Date(openCode.expires_at)}
            redemptionId={openCode.id}
            onClose={() => { setOpenCode(null); loadRedemptions() }}
            onRedeemed={() => loadRedemptions()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
