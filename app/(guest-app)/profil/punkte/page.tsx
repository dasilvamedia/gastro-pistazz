'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PointsTransaction } from '@/types'

const TX_TYPE_LABELS: Record<string, string> = {
  earned: 'Verdient',
  spent: 'Ausgegeben',
  bonus: 'Bonus',
  expired: 'Abgelaufen',
  refund: 'Rückerstattung',
}

const TX_TYPE_EMOJI: Record<string, string> = {
  earned: '📸',
  spent: '🎁',
  bonus: '🌟',
  expired: '⏰',
  refund: '↩️',
}

export default function PunkteverlaufPage() {
  const router = useRouter()
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: tx }, { data: profile }] = await Promise.all([
        supabase
          .from('points_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('profiles')
          .select('available_points')
          .eq('id', user.id)
          .single(),
      ])

      setTransactions(tx ?? [])
      setTotal(profile?.available_points ?? 0)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      {/* Header */}
      <div className="gradient-primary px-5 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-4"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Punkte-Verlauf
        </h1>
        <p className="text-white/70 text-sm mt-1">Guthaben: <span className="font-bold text-white">{total} P</span></p>
      </div>

      <div className="px-5 pt-5 space-y-2">
        {loading && (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))
        )}

        {!loading && transactions.length === 0 && (
          <div className="text-center py-16 text-[#6D9450]/60">
            <p className="text-4xl mb-3">🪙</p>
            <p className="font-semibold">Noch keine Punkte</p>
            <p className="text-sm mt-1">Teile dein Restaurant-Erlebnis auf Instagram!</p>
          </div>
        )}

        {!loading && transactions.map(tx => {
          const isEarned = tx.amount > 0
          return (
            <div
              key={tx.id}
              className="bg-white rounded-2xl px-4 py-3 border border-[#EEF5E6] flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                isEarned ? 'bg-green-100' : 'bg-red-50'
              }`}>
                {TX_TYPE_EMOJI[tx.type] ?? '🪙'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#1C1F1A] font-semibold text-sm truncate">
                  {tx.description ?? TX_TYPE_LABELS[tx.type]}
                </p>
                <p className="text-[#6D9450] text-xs mt-0.5">
                  {new Date(tx.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-bold text-base ${isEarned ? 'text-green-600' : 'text-[#E86B5A]'}`}>
                  {isEarned ? '+' : ''}{tx.amount} P
                </p>
                {tx.balance_after != null && (
                  <p className="text-[#1C1F1A]/40 text-xs">{tx.balance_after} P gesamt</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
