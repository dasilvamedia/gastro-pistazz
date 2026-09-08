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

const SUB_TYPE_LABELS: Record<string, string> = {
  instagram_story: 'Story',
  instagram_reel: 'Reel',
  instagram_post: 'Post',
  google_review: 'Google-Bewertung',
  receipt: 'Kassenbon',
}

// Eigene Einreichungen mit Status; bei Stories ohne Kassenbon kann er hier
// nachgereicht werden (bezahlt wird oft erst lange nach dem Posten).
type MySubmission = {
  id: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  receipt_url: string | null
  nfc_confirmed_at: string | null
  points_awarded: number | null
  created_at: string
  restaurant: { name: string; slug: string } | null
}

export default function PunkteverlaufPage() {
  const router = useRouter()
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [submissions, setSubmissions] = useState<MySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: tx }, { data: profile }, { data: subs }] = await Promise.all([
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
        supabase
          .from('story_submissions')
          .select('id, type, status, receipt_url, nfc_confirmed_at, points_awarded, created_at, restaurant:restaurants(name, slug)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      setTransactions(tx ?? [])
      setTotal(profile?.available_points ?? 0)
      setSubmissions((subs as unknown as MySubmission[]) ?? [])
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

      {/* Meine Einreichungen: Status jeder Story/Bewertung, Kassenbon nachreichbar */}
      {!loading && submissions.length > 0 && (
        <div className="px-5 pt-5">
          <h2 className="text-[#1C1F1A] font-bold text-base mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Meine Einreichungen
          </h2>
          <div className="space-y-2">
            {submissions.map(s => {
              const needsReceipt = s.type === 'instagram_story' && s.status === 'pending' && !s.receipt_url && !s.nfc_confirmed_at
              const windowExpired = needsReceipt && Date.now() - new Date(s.created_at).getTime() > 5 * 3600 * 1000
              const chip = windowExpired
                ? { label: '📲 Beim nächsten Besuch bestätigen', cls: 'bg-amber-100 text-amber-800' }
                : needsReceipt
                ? { label: '🧾 Kassenbon fehlt', cls: 'bg-amber-100 text-amber-800' }
                : s.status === 'pending'
                ? { label: '⏳ In Prüfung', cls: 'bg-blue-50 text-blue-700' }
                : s.status === 'approved'
                ? { label: '✓ Genehmigt', cls: 'bg-green-100 text-green-700' }
                : { label: '✗ Abgelehnt', cls: 'bg-red-50 text-red-600' }
              const inner = (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1C1F1A] font-semibold text-sm truncate">
                      {SUB_TYPE_LABELS[s.type] ?? s.type}{s.restaurant ? ` · ${s.restaurant.name}` : ''}
                    </p>
                    <p className="text-[#6D9450] text-xs mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {s.status === 'approved' && s.points_awarded ? ` · +${s.points_awarded} P` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${chip.cls}`}>{chip.label}</span>
                </>
              )
              return needsReceipt ? (
                <button
                  key={s.id}
                  onClick={() => router.push(`/story/submit?submission=${s.id}${s.restaurant?.slug ? `&restaurant=${s.restaurant.slug}` : ''}`)}
                  className="w-full bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  {inner}
                </button>
              ) : (
                <div key={s.id} className="bg-white rounded-2xl px-4 py-3 border border-[#EEF5E6] flex items-center gap-3">
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
