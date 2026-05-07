'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Pencil, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Profile, PointsTransaction, StampCard } from '@/types'
import { TIER_CONFIG } from '@/types'
import { MOCK_USER, MOCK_TRANSACTIONS, IS_MOCK_MODE } from '@/lib/mock-data'

function Avatar({ name }: { name: string | null }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'G'
  return (
    <div className="w-20 h-20 rounded-full bg-white/30 border-4 border-white flex items-center justify-center">
      <span className="text-white text-2xl font-bold">{initials}</span>
    </div>
  )
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex-1 bg-white/20 rounded-2xl p-3 text-center">
      <p className="text-white text-xl font-bold">{value}</p>
      <p className="text-white/80 text-xs">{label}</p>
    </div>
  )
}

function MenuCard({ emoji, label, sub, onClick }: { emoji: string; label: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl p-4 border border-[#EEF5E6] flex items-center gap-3 text-left">
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1">
        <p className="text-[#1C1F1A] font-semibold">{label}</p>
        {sub && <p className="text-[#6D9450] text-xs">{sub}</p>}
      </div>
      <ChevronRight size={18} className="text-[#8BB06A]" />
    </button>
  )
}

const TX_TYPE_LABELS: Record<string, string> = {
  earned: 'Verdient',
  spent: 'Ausgegeben',
  bonus: 'Bonus',
  expired: 'Abgelaufen',
  refund: 'Rückerstattung',
}

export default function ProfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [stampCards, setStampCards] = useState<StampCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let userId: string | null = null

    const load = async () => {
      if (IS_MOCK_MODE) {
        setProfile(MOCK_USER)
        setTransactions(MOCK_TRANSACTIONS)
        setLoading(false)
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        userId = user.id

        const [{ data: p }, { data: tx }, { data: sc }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('points_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('stamp_cards').select('*, restaurant:restaurants(name, primary_color)').eq('user_id', user.id).limit(5),
        ])

        setProfile(p ?? null)
        setTransactions(tx ?? [])
        setStampCards(sc ?? [])
      } catch {
        toast.error('Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()

    // Realtime: update points when new transaction arrives
    const channel = supabase
      .channel('profil-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'points_transactions',
        filter: userId ? `user_id=eq.${userId}` : undefined,
      }, async (payload) => {
        // Reload profile + transactions on new point event
        if (!userId) return
        const [{ data: p }, { data: tx }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase.from('points_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        ])
        if (p) setProfile(p)
        if (tx) setTransactions(tx)
        toast.success(`+${(payload.new as any).amount} Punkte erhalten! 🎉`)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF5E6]">
        <div className="skeleton h-52 w-full rounded-b-3xl" />
        <div className="px-5 pt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const tier = profile?.tier ?? 'bronze'
  const tierCfg = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      {/* Header */}
      <div className="gradient-primary rounded-b-3xl pb-6 pt-12 px-5">
        <div className="flex items-start justify-between mb-4">
          <Avatar name={profile?.full_name ?? null} />
          <button
            onClick={() => router.push('/profil/einstellungen')}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
          >
            <Pencil size={16} className="text-white" />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
          {profile?.full_name ?? 'Gast'}
        </h1>

        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 mb-4 text-xs font-bold"
          style={{ backgroundColor: tierCfg.color + '33', color: tierCfg.color === '#E2E8F0' ? '#1C1F1A' : '#fff' }}
        >
          {tierCfg.label} ✨
        </motion.div>

        <div className="flex gap-2">
          <StatCard value={profile?.available_points ?? 0} label="Punkte" />
          <StatCard value={profile?.total_stories ?? 0} label="Stories" />
          <StatCard value={profile?.total_visits ?? 0} label="Besuche" />
        </div>
      </div>

      <div className="px-5 pt-5 space-y-3">
        <MenuCard emoji="💰" label="Meine Deals" onClick={() => router.push('/deals')} />
        <MenuCard
          emoji="🃏"
          label="Stempelkarten"
          sub={`${stampCards.filter(s => !s.is_completed).length} aktiv`}
          onClick={() => {}}
        />
        <MenuCard emoji="📊" label="Punkte-Verlauf" onClick={() => {}} />
        <MenuCard emoji="⚙️" label="Einstellungen" onClick={() => router.push('/profil/einstellungen')} />

        {/* Points transactions */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EEF5E6] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EEF5E6]">
              <h2 className="text-[#1C1F1A] font-bold">Punkte-Verlauf</h2>
            </div>
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#EEF5E6] last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  tx.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {tx.amount > 0 ? '+' : ''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1C1F1A] text-sm font-semibold truncate">{tx.description ?? TX_TYPE_LABELS[tx.type]}</p>
                  <p className="text-[#6D9450] text-xs">{new Date(tx.created_at).toLocaleDateString('de-DE')}</p>
                </div>
                <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-[#E86B5A]'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} P
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
