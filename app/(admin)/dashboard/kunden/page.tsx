'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Profile, TIER_CONFIG } from '@/types'
import { MOCK_ADMIN_PROFILES, IS_MOCK_MODE } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X } from 'lucide-react'

type SortKey = 'total_points' | 'total_visits' | 'total_stories'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 20

export default function KundenPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('total_points')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ search, sortKey, sortDir, page: String(page) })
    const res = await fetch(`/api/dashboard/kunden?${params}`)
    if (!res.ok) { setLoading(false); return }
    const { profiles: data, total: count } = await res.json()
    setProfiles(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [search, sortKey, sortDir, page])

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setProfiles(MOCK_ADMIN_PROFILES)
      setTotal(MOCK_ADMIN_PROFILES.length)
      setLoading(false)
      return
    }
    fetchProfiles()
  }, [fetchProfiles])

  // Restaurant-ID für Echtzeit-Subscription
  useEffect(() => {
    if (IS_MOCK_MODE) return
    fetch('/api/dashboard/restaurant')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.restaurant?.id) setRestaurantId(d.restaurant.id) })
      .catch(() => null)
  }, [])

  // Echtzeit: neue Aktivitäten → Liste aktualisieren
  useEffect(() => {
    if (!restaurantId || IS_MOCK_MODE) return
    const channel = supabase
      .channel(`kunden-rt-${restaurantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'points_transactions',
        filter: `restaurant_id=eq.${restaurantId}` }, () => fetchProfiles())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_submissions',
        filter: `restaurant_id=eq.${restaurantId}` },
        () => { fetchProfiles(); toast('Neue Story eingereicht 📸', { icon: '🎉' }) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deal_redemptions',
        filter: `restaurant_id=eq.${restaurantId}` },
        () => { fetchProfiles(); toast('Deal eingelöst!', { icon: '🎁' }) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, fetchProfiles, supabase])

  useEffect(() => { setPage(0) }, [search])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '↕'
    return sortDir === 'desc' ? '↓' : '↑'
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleAddUser = async () => {
    if (!addEmail.trim()) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Fehler beim Hinzufügen')
      } else {
        toast.success(`${data.name} wurde hinzugefügt ✅`)
        setShowAddModal(false)
        setAddEmail('')
        fetchProfiles()
      }
    } catch {
      toast.error('Verbindungsfehler')
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Modal: Nutzer manuell hinzufügen */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1C1F1A] text-lg">Kunde manuell hinzufügen</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              E-Mail-Adresse des Nutzers eingeben — dieser wird sofort in deiner Kundendatenbank sichtbar.
              <br /><span className="text-[#8BB06A] font-medium">Hinweis:</span> Normalerweise erscheinen Kunden automatisch sobald sie eine Story eingereicht, Punkte gesammelt oder einen Deal eingelöst haben.
            </p>
            <input
              type="email"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUser()}
              placeholder="nutzer@beispiel.de"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                Abbrechen
              </button>
              <button onClick={handleAddUser} disabled={addLoading || !addEmail.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-semibold hover:bg-[#7a9e5e] disabled:opacity-60 flex items-center justify-center gap-2">
                {addLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1F1A]">Kundendatenbank</h1>
          <p className="text-sm text-gray-500">{total} Kunden gesamt · nur Nutzer mit Aktivität</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Name oder E-Mail suchen..."
            className="flex-1 sm:w-64 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]" />
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] whitespace-nowrap">
            <UserPlus className="w-4 h-4" /> Kunde
          </button>
          <button onClick={() => toast('Coming soon', { icon: '🔜' })}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-500 text-sm hover:bg-gray-50 whitespace-nowrap">
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 space-y-2">
          <p className="text-4xl">👥</p>
          <p className="font-medium">Noch keine Kunden</p>
          <p className="text-sm">Kunden erscheinen sobald sie eine Story eingereicht, Punkte gesammelt oder einen Deal eingelöst haben.</p>
        </div>
      ) : (
        <>
          <div className="hidden lg:block glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#EEF5E6]">
                <tr>
                  <th className="text-left p-4 font-medium text-[#1C1F1A]">Kunde</th>
                  <th className="text-left p-4 font-medium text-[#1C1F1A]">Tier</th>
                  <th className="text-left p-4 font-medium text-[#1C1F1A] cursor-pointer select-none" onClick={() => handleSort('total_points')}>
                    Punkte {sortIndicator('total_points')}
                  </th>
                  <th className="text-left p-4 font-medium text-[#1C1F1A] cursor-pointer select-none" onClick={() => handleSort('total_stories')}>
                    Stories {sortIndicator('total_stories')}
                  </th>
                  <th className="text-left p-4 font-medium text-[#1C1F1A] cursor-pointer select-none" onClick={() => handleSort('total_visits')}>
                    Besuche {sortIndicator('total_visits')}
                  </th>
                  <th className="text-left p-4 font-medium text-[#1C1F1A]">Erstellt</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map(p => {
                  const tier = TIER_CONFIG[p.tier]
                  return (
                    <tr key={p.id} className="hover:bg-[#EEF5E6]/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
                            {(p.full_name ?? p.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[#1C1F1A]">{p.full_name ?? '—'}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: tier.color }}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-[#1C1F1A]">{p.total_points.toLocaleString('de')}</td>
                      <td className="p-4 text-gray-600">{p.total_stories}</td>
                      <td className="p-4 text-gray-600">{p.total_visits}</td>
                      <td className="p-4 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('de')}</td>
                      <td className="p-4">
                        <Link href={`/dashboard/kunden/${p.id}`}
                          className="text-xs px-3 py-1 rounded-lg border border-[#8BB06A] text-[#8BB06A] hover:bg-[#EEF5E6]"
                          onClick={e => e.stopPropagation()}>
                          Ansehen
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {profiles.map(p => {
              const tier = TIER_CONFIG[p.tier]
              return (
                <Link key={p.id} href={`/dashboard/kunden/${p.id}`} className="glass rounded-xl p-4 flex items-center gap-3 block">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                    {(p.full_name ?? p.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1F1A] truncate">{p.full_name ?? p.email}</p>
                    <p className="text-xs text-gray-500">{p.total_points} Punkte • {p.total_stories} Stories</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: tier.color }}>
                    {tier.label}
                  </span>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">
                ← Zurück
              </button>
              <span className="text-sm text-gray-500">Seite {page + 1} von {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">
                Weiter →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
