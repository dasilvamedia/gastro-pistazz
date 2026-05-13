'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Search, Filter, LayoutGrid, List, Users, TrendingUp } from 'lucide-react'
import { KanbanBoard } from './_components/KanbanBoard'
import { AiComposer, type KanbanCol } from './_components/AiComposer'

interface RestaurantRef { restaurant_id: string; name: string; source: string }

interface UserRow {
  id: string; email: string; name: string | null; provider: string
  created_at: string; restaurant_id: string | null; restaurant_name: string | null
  restaurant_slug: string | null; total_points: number; available_points: number
  total_stories: number; total_visits: number; role: string
  all_restaurants: RestaurantRef[]
}
interface Restaurant { id: string; name: string; slug: string }
interface Kpi { total: number; today: number; this_week: number; google: number; apple: number; email: number }

const PROV_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  google: { label: 'G',      bg: '#EBF3FB', color: '#1a73e8' },
  apple:  { label: '',      bg: '#f0f0f0', color: '#1C1F1A' },
  email:  { label: '✉',     bg: '#FEF3C7', color: '#92400E' },
}
const PROV_FULL: Record<string, string> = {
  google: 'Google', apple: 'Apple', email: 'E-Mail',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60) || 1}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function segment(u: UserRow): { label: string; color: string; bg: string } {
  const days = (Date.now() - new Date(u.created_at).getTime()) / 86400000
  if (u.total_stories >= 3 || u.total_points >= 500) return { label: 'VIP',     color: '#92400E', bg: '#FEF3C7' }
  if (u.total_stories > 0  || u.total_points > 0)   return { label: 'Aktiv',   color: '#3D7A22', bg: '#EEF5E6' }
  if (days > 14)                                      return { label: 'Inaktiv', color: '#6B7280', bg: '#F3F4F6' }
  return                                                     { label: 'Neu',     color: '#1D4ED8', bg: '#EFF6FF' }
}

const PAGE = 30

export default function NutzerPage() {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [restaurants, setRests] = useState<Restaurant[]>([])
  const [kpi, setKpi]           = useState<Kpi | null>(null)
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [search, setSearch]     = useState('')
  const [filterRest, setFilterR] = useState('')
  const [filterProv, setFilterP] = useState('')
  const [view, setView]         = useState<'table' | 'kanban'>('table')

  const [overrides, setOverrides] = useState<Record<string, KanbanCol>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('kanban_overrides') ?? '{}') } catch { return {} }
  })
  const [composeCol, setComposeCol]     = useState<KanbanCol | null>(null)
  const [composeCount, setComposeCount] = useState(0)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ search, restaurant: filterRest, provider: filterProv, page: String(page) })
    try {
      const res = await fetch(`/api/admin/all-users?${params}`)
      if (!res.ok) return
      const d = await res.json()
      setUsers(d.users ?? [])
      setTotal(d.total ?? 0)
      setRests(d.restaurants ?? [])
      if (d.kpi) setKpi(d.kpi)
    } finally { setLoading(false) }
  }, [search, filterRest, filterProv, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { setPage(0) }, [search, filterRest, filterProv])

  const handleMove = (userId: string, col: KanbanCol) => {
    const next = { ...overrides, [userId]: col }
    setOverrides(next)
    localStorage.setItem('kanban_overrides', JSON.stringify(next))
  }

  const totalPages   = Math.ceil(total / PAGE)
  const totalAvail   = users.reduce((s, u) => s + (u.available_points ?? 0), 0)
  const avgPts       = users.length > 0 ? Math.round(totalAvail / users.length) : 0

  return (
    <div className="p-6 space-y-6">
      {composeCol && (
        <AiComposer
          column={composeCol}
          userCount={composeCount}
          restaurants={restaurants}
          onClose={() => setComposeCol(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1F1A]">Nutzer-Übersicht</h1>
          <p className="text-sm text-gray-400">Nur Gäste · Super Admin</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'table' ? 'bg-white shadow-sm text-[#1C1F1A]' : 'text-gray-400'}`}>
              <List className="w-4 h-4" /> Tabelle
            </button>
            <button onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-[#1C1F1A]' : 'text-gray-400'}`}>
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
          </div>
          <button onClick={fetchUsers} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI-Karten */}
      {kpi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Nutzer gesamt', value: kpi.total,  icon: '👥', sub: `${kpi.this_week} diese Woche` },
            { label: 'Heute neu',     value: kpi.today,  icon: '🆕', sub: 'Neue Registrierungen' },
            { label: '🟦 Google',    value: kpi.google, icon: '',   sub: `🍎 ${kpi.apple} Apple · ✉ ${kpi.email} E-Mail` },
            { label: 'Ø Punkte',      value: avgPts,     icon: '⭐', sub: `${totalAvail} Pkt gesamt verfügbar` },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-[#8BB06A]">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
              <p className="text-3xl font-bold text-[#1C1F1A] mt-1">{c.icon} {c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name oder E-Mail…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={filterRest} onChange={e => setFilterR(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#8BB06A] appearance-none">
            <option value="">Alle Restaurants</option>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <select value={filterProv} onChange={e => setFilterP(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#8BB06A]">
          <option value="">Alle Anmeldewege</option>
          <option value="google">🟦 Google</option>
          <option value="apple">🍎 Apple</option>
          <option value="email">✉ E-Mail</option>
        </select>
      </div>

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <>
          <p className="text-xs text-gray-400">
            Nutzer per <strong>Drag &amp; Drop</strong> zwischen Spalten verschieben · Klicke auf <strong>KI</strong> um eine Nachricht für das Segment zu erstellen
          </p>
          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <KanbanBoard users={users} overrides={overrides} onMove={handleMove}
              onCompose={(col, count) => { setComposeCol(col); setComposeCount(count) }} />
          )}
        </>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Column headers */}
          <div className="hidden lg:grid grid-cols-[2fr_1.4fr_0.9fr_0.7fr_0.7fr_0.6fr_0.7fr] gap-x-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-[#8BB06A]" />{total} Nutzer</span>
            <span>Restaurant</span>
            <span>Segment</span>
            <span className="text-right">Pkt verfügbar</span>
            <span className="text-right">Pkt gesamt</span>
            <span className="text-right">Stories</span>
            <span className="text-right flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
            </span>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Keine Nutzer gefunden</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map(u => {
                const b   = PROV_BADGE[u.provider] ?? PROV_BADGE.email
                const seg = segment(u)
                const spent = Math.max(0, u.total_points - u.available_points)
                const uniqueRests = Array.from(new Map(u.all_restaurants.map(r => [r.restaurant_id, r])).values())

                return (
                  <div key={u.id}
                    className="grid grid-cols-1 lg:grid-cols-[2fr_1.4fr_0.9fr_0.7fr_0.7fr_0.6fr_0.7fr] gap-x-4 gap-y-1 px-4 py-3 hover:bg-gray-50/70 transition-colors items-center">

                    {/* ── Identität ── */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8BB06A] to-[#577A3D] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(u.name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-[#1C1F1A] text-sm truncate">
                            {u.name ?? <span className="italic text-gray-400 font-normal">kein Name</span>}
                          </p>
                          {/* Provider-Icon */}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                            style={{ background: b.bg, color: b.color }}>
                            {b.label} {PROV_FULL[u.provider] ?? 'E-Mail'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        <p className="text-[10px] text-gray-300 lg:hidden mt-0.5">{timeAgo(u.created_at)} · {u.total_visits} Besuche</p>
                      </div>
                    </div>

                    {/* ── Restaurants ── */}
                    <div className="hidden lg:flex flex-col gap-1 min-w-0">
                      {uniqueRests.length === 0
                        ? <span className="text-xs text-gray-300 italic">–</span>
                        : uniqueRests.slice(0, 2).map(r => (
                            <span key={r.restaurant_id} className="text-[11px] bg-[#EEF5E6] text-[#577A3D] px-2 py-0.5 rounded-full font-medium truncate max-w-full">
                              🍽️ {r.name}
                            </span>
                          ))
                      }
                      {uniqueRests.length > 2 && (
                        <span className="text-[10px] text-gray-400">+{uniqueRests.length - 2} weitere</span>
                      )}
                    </div>

                    {/* ── Segment ── */}
                    <div className="hidden lg:flex justify-start">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ background: seg.bg, color: seg.color }}>
                        {seg.label}
                      </span>
                    </div>

                    {/* ── Punkte verfügbar ── */}
                    <div className="hidden lg:block text-right">
                      <p className="text-sm font-bold text-yellow-600">{u.available_points}</p>
                      {spent > 0 && <p className="text-[10px] text-gray-400">{spent} ausgeg.</p>}
                    </div>

                    {/* ── Punkte gesamt ── */}
                    <div className="hidden lg:block text-right">
                      <p className="text-sm font-semibold text-gray-600">{u.total_points}</p>
                      <p className="text-[10px] text-gray-400">verdient</p>
                    </div>

                    {/* ── Stories ── */}
                    <div className="hidden lg:block text-right">
                      {u.total_stories > 0
                        ? <p className="text-sm font-bold text-purple-600">{u.total_stories} 📸</p>
                        : <p className="text-sm text-gray-300">–</p>}
                    </div>

                    {/* ── Datum ── */}
                    <div className="hidden lg:block text-right">
                      <p className="text-xs font-medium text-gray-500">{timeAgo(u.created_at)}</p>
                      <p className="text-[10px] text-gray-400">{u.total_visits} Besuch{u.total_visits !== 1 ? 'e' : ''}</p>
                    </div>

                    {/* ── Mobile: kompakte Chips ── */}
                    <div className="flex lg:hidden items-center gap-2 flex-wrap mt-0.5 ml-12">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                        style={{ background: seg.bg, color: seg.color }}>{seg.label}</span>
                      {uniqueRests[0] && (
                        <span className="text-[10px] bg-[#EEF5E6] text-[#577A3D] px-2 py-0.5 rounded-full font-medium truncate max-w-28">
                          🍽️ {uniqueRests[0].name}
                        </span>
                      )}
                      <span className="text-[10px] text-yellow-600 font-semibold">{u.available_points} Pkt</span>
                      {u.total_stories > 0 && <span className="text-[10px] text-purple-600 font-semibold">{u.total_stories} 📸</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Zurück</button>
              <span className="text-sm text-gray-400">Seite {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Weiter →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
