'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Receipt, Smartphone, Clock, CheckCircle2, XCircle, Camera, Star, Film, Image as ImageIcon, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Eigener Bereich fuer alle Einreichungen des Gastes: was wartet noch auf den
// Kassenbon, was wird geprueft, was wurde genehmigt und verrechnet.

const PROOF_WINDOW_MS = 5 * 60 * 60 * 1000

const TYPE_META: Record<string, { label: string; Icon: typeof Camera }> = {
  instagram_story: { label: 'Story', Icon: Camera },
  instagram_reel: { label: 'Reel', Icon: Film },
  instagram_post: { label: 'Post', Icon: ImageIcon },
  google_review: { label: 'Google-Bewertung', Icon: Star },
  receipt: { label: 'Kassenbon', Icon: Receipt },
}

type Submission = {
  id: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  receipt_url: string | null
  nfc_confirmed_at: string | null
  points_awarded: number | null
  created_at: string
  restaurant: { name: string; slug: string } | null
}

export default function EinreichungenPage() {
  const router = useRouter()
  const supabase = createClient()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('story_submissions')
        .select('id, type, status, receipt_url, nfc_confirmed_at, points_awarded, created_at, restaurant:restaurants(name, slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setSubmissions((data as unknown as Submission[]) ?? [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openCount = submissions.filter(s =>
    s.type === 'instagram_story' && s.status === 'pending' && !s.receipt_url && !s.nfc_confirmed_at
  ).length

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      <div className="gradient-primary px-5 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mb-4"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Meine Einreichungen
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {openCount > 0 ? `${openCount} ${openCount === 1 ? 'Einreichung wartet' : 'Einreichungen warten'} auf deinen Kassenbon` : 'Alle Einreichungen und ihr Status'}
        </p>
      </div>

      <div className="px-5 pt-5 space-y-2.5">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}

        {!loading && submissions.length === 0 && (
          <div className="text-center py-16 text-[#6D9450]/60">
            <Camera size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold">Noch keine Einreichungen</p>
            <p className="text-sm mt-1">Teile deinen Besuch als Story und sammle Punkte.</p>
          </div>
        )}

        {!loading && submissions.map(s => {
          const meta = TYPE_META[s.type] ?? TYPE_META.instagram_story
          const needsReceipt = s.type === 'instagram_story' && s.status === 'pending' && !s.receipt_url && !s.nfc_confirmed_at
          const windowExpired = needsReceipt && Date.now() - new Date(s.created_at).getTime() > PROOF_WINDOW_MS
          const proofUrl = `/story/submit?submission=${s.id}${s.restaurant?.slug ? `&restaurant=${s.restaurant.slug}` : ''}`

          const status = windowExpired
            ? { text: 'Beim nächsten Besuch bestätigen', cls: 'text-amber-800', Icon: Smartphone, iconCls: 'text-amber-600' }
            : needsReceipt
            ? { text: 'Kassenbon fehlt noch', cls: 'text-amber-800', Icon: Receipt, iconCls: 'text-amber-600' }
            : s.status === 'pending'
            ? { text: 'In Prüfung', cls: 'text-blue-700', Icon: Clock, iconCls: 'text-blue-500' }
            : s.status === 'approved'
            ? { text: s.points_awarded ? `Genehmigt, +${s.points_awarded} P verrechnet` : 'Genehmigt', cls: 'text-green-700', Icon: CheckCircle2, iconCls: 'text-green-600' }
            : { text: 'Abgelehnt', cls: 'text-red-600', Icon: XCircle, iconCls: 'text-red-500' }

          const card = (
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${needsReceipt ? 'bg-amber-100' : 'bg-[#EEF5E6]'}`}>
                <meta.Icon size={20} className={needsReceipt ? 'text-amber-700' : 'text-[#577A3D]'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#1C1F1A] font-semibold text-sm truncate">
                  {meta.label}{s.restaurant ? ` · ${s.restaurant.name}` : ''}
                </p>
                <p className={`text-xs mt-0.5 flex items-center gap-1.5 font-medium ${status.cls}`}>
                  <status.Icon size={13} className={status.iconCls} />
                  {status.text}
                </p>
                <p className="text-[#1C1F1A]/35 text-[11px] mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr
                </p>
              </div>
              {needsReceipt && <ChevronRight size={18} className="text-amber-500 flex-shrink-0" />}
            </div>
          )

          return needsReceipt ? (
            <button
              key={s.id}
              onClick={() => router.push(proofUrl)}
              className="w-full text-left bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3.5 active:scale-[0.99] transition-transform"
            >
              {card}
            </button>
          ) : (
            <div key={s.id} className="bg-white rounded-2xl px-4 py-3.5 border border-[#EEF5E6]">
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
