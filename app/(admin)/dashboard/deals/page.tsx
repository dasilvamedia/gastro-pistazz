'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Deal, DealStatus, TRIGGER_CONFIG } from '@/types'
import { MOCK_DEALS, IS_MOCK_MODE } from '@/lib/mock-data'

type FilterTab = 'alle' | DealStatus

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'active', label: 'Aktiv' },
  { key: 'paused', label: 'Pausiert' },
  { key: 'draft', label: 'Entwurf' },
]

export default function DealsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('alle')
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setDeals(MOCK_DEALS)
      setLoading(false)
      return
    }
    fetch('/api/dashboard/restaurant').then(r => r.json()).then(({ restaurant: rest }) => {
      if (rest) { setRestaurantId(rest.id); fetchDeals(rest.id) }
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const fetchDeals = async (rid: string) => {
    setLoading(true)
    const { data } = await supabase.from('deals').select('*').eq('restaurant_id', rid).order('sort_order')
    setDeals(data ?? [])
    setLoading(false)
  }

  const toggleDealStatus = async (deal: Deal) => {
    const newStatus: DealStatus = deal.status === 'active' ? 'paused' : 'active'
    const { error } = await supabase.from('deals').update({ status: newStatus }).eq('id', deal.id)
    if (error) { toast.error('Fehler beim Aktualisieren'); return }
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: newStatus } : d))
    toast.success(newStatus === 'active' ? 'Deal aktiviert' : 'Deal pausiert')
  }

  const deleteDeal = async (id: string) => {
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (error) { toast.error('Loeschen fehlgeschlagen'); return }
    setDeals(prev => prev.filter(d => d.id !== id))
    setDeleteId(null)
    toast.success('Deal geloescht')
  }

  const filtered = tab === 'alle' ? deals : deals.filter(d => d.status === tab)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Meine Deals</h1>
        <Link href="/dashboard/deals/neu" className="gradient-primary px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity">
          + Neuen Deal erstellen
        </Link>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#8BB06A] text-[#8BB06A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🎁</p>
          <p>Noch keine Deals vorhanden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(deal => {
            const trigger = TRIGGER_CONFIG[deal.trigger]
            return (
              <div key={deal.id} className="glass rounded-xl overflow-hidden">
                <div className="h-24 gradient-primary flex items-center justify-center relative">
                  <span className="text-4xl">{trigger.emoji}</span>
                  {deal.badge_text && (
                    <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: deal.badge_color || '#8BB06A' }}>
                      {deal.badge_text}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-[#1C1F1A] line-clamp-1">{deal.title}</h3>
                    <p className="text-xs text-gray-500">{trigger.emoji} {trigger.label}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>🎉 {deal.total_redemptions} Eingeloest</span>
                    <span>👁️ {deal.total_reach} Reichweite</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={deal.status === 'active'}
                          onChange={() => toggleDealStatus(deal)} />
                        <div className={`w-10 h-5 rounded-full transition-colors ${deal.status === 'active' ? 'bg-[#8BB06A]' : 'bg-gray-300'}`} />
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${deal.status === 'active' ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-xs text-gray-500">{deal.status === 'active' ? 'Aktiv' : 'Pausiert'}</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/dashboard/deals/${deal.id}/edit`)}
                        className="text-xs px-3 py-1 rounded-lg border border-[#8BB06A] text-[#8BB06A] hover:bg-[#EEF5E6] transition-colors">
                        Bearbeiten
                      </button>
                      <button onClick={() => setDeleteId(deal.id)}
                        className="text-xs px-3 py-1 rounded-lg border border-[#E86B5A] text-[#E86B5A] hover:bg-red-50 transition-colors">
                        Loeschen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1C1F1A] mb-2">Deal loeschen?</h3>
            <p className="text-sm text-gray-500 mb-4">Diese Aktion kann nicht rueckgaengig gemacht werden.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">
                Abbrechen
              </button>
              <button onClick={() => deleteDeal(deleteId)}
                className="flex-1 px-4 py-2 rounded-lg bg-[#E86B5A] text-white text-sm hover:opacity-90">
                Loeschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
