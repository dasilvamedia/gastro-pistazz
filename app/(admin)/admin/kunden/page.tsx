'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Profile, TIER_CONFIG } from '@/types'
import { MOCK_ADMIN_PROFILES, IS_MOCK_MODE } from '@/lib/mock-data'

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

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('profiles').select('*', { count: 'exact' })
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    query = query.order(sortKey, { ascending: sortDir === 'asc' }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    const { data, count } = await query
    setProfiles(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase, search, sortKey, sortDir, page])

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setProfiles(MOCK_ADMIN_PROFILES)
      setTotal(MOCK_ADMIN_PROFILES.length)
      setLoading(false)
      return
    }
    fetchProfiles()
  }, [fetchProfiles])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '↕'
    return sortDir === 'desc' ? '↓' : '↑'
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1F1A]">Kundendatenbank</h1>
          <p className="text-sm text-gray-500">{total} Kunden gesamt</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Name oder E-Mail suchen..."
            className="flex-1 sm:w-64 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]" />
          <button onClick={() => toast('Coming soon', { icon: '🔜' })}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-500 text-sm hover:bg-gray-50 whitespace-nowrap">
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
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
                    <tr key={p.id} className="hover:bg-[#EEF5E6]/50 cursor-pointer transition-colors" onClick={() => {}}>
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
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: tier.color }}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-[#1C1F1A]">{p.total_points.toLocaleString('de')}</td>
                      <td className="p-4 text-gray-600">{p.total_stories}</td>
                      <td className="p-4 text-gray-600">{p.total_visits}</td>
                      <td className="p-4 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('de')}</td>
                      <td className="p-4">
                        <Link href={`/admin/kunden/${p.id}`}
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
                <Link key={p.id} href={`/admin/kunden/${p.id}`} className="glass rounded-xl p-4 flex items-center gap-3 block">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                    {(p.full_name ?? p.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1F1A] truncate">{p.full_name ?? p.email}</p>
                    <p className="text-xs text-gray-500">{p.total_points} Punkte • {p.total_visits} Besuche</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                    style={{ backgroundColor: tier.color }}>
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
                ← Zurueck
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
