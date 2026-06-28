'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, RefreshCw, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import type { RestaurantType } from '@/types'

interface RestaurantRow {
  id: string
  slug: string | null
  name: string
  type: RestaurantType
  city: string | null
  total_stories: number
  total_customers: number
  is_active: boolean
  is_verified: boolean
  owner: { full_name: string | null } | null
}

const RESTAURANT_TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  cafe: 'Café',
  fine_dining: 'Fine Dining',
  biergarten: 'Biergarten',
  eisdiele: 'Eisdiele',
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {active ? 'Aktiv' : 'Inaktiv'}
    </span>
  )
}

export default function AdminRestaurantsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [cities, setCities] = useState<string[]>([])

  const loadRestaurants = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('restaurants')
        .select('id, slug, name, type, city, total_stories, total_customers, is_active, is_verified, owner:profiles!owner_id(full_name)')
        .order('created_at', { ascending: false })

      if (filterStatus === 'active') query = query.eq('is_active', true)
      if (filterStatus === 'inactive') query = query.eq('is_active', false)
      if (filterCity) query = query.eq('city', filterCity)

      const { data, error } = await query
      if (error) throw error

      const rows = (data ?? []).map((r: unknown) => {
        const row = r as Record<string, unknown>
        return {
          ...row,
          owner: Array.isArray(row.owner) ? row.owner[0] ?? null : row.owner ?? null,
        } as RestaurantRow
      })

      const allCities = Array.from(new Set(rows.map((r) => r.city).filter(Boolean))) as string[]
      setCities(allCities)
      setRestaurants(rows)
    } catch {
      toast.error('Fehler beim Laden der Restaurants')
    } finally {
      setLoading(false)
    }
  }, [filterCity, filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadRestaurants()
  }, [loadRestaurants])

  useEffect(() => {
    const channel = supabase
      .channel('restaurants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
        loadRestaurants()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadRestaurants]) // eslint-disable-line react-hooks/exhaustive-deps

  // Kundenansicht: öffnet das Restaurant-Dashboard als wärst du der Inhaber
  const handleKundenansicht = (restaurantId: string, restaurantName: string) => {
    document.cookie = `impersonate_restaurant_id=${restaurantId}; path=/; max-age=3600`
    // Store name in cookie so sidebar can read it synchronously without an API call
    document.cookie = `impersonate_restaurant_name=${encodeURIComponent(restaurantName)}; path=/; max-age=3600`
    router.push('/dashboard')
  }

  const filtered = restaurants.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q) || (r.city ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-charcoal">Alle Restaurants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{restaurants.length} Restaurants gesamt</p>
        </div>
        <Link
          href="/admin/restaurants/neu"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neues Restaurant
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Nach Name oder Stadt suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>

        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Alle Städte</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>

        <button
          onClick={() => loadRestaurants()}
          className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">Keine Restaurants gefunden</p>
            <p className="text-gray-300 text-xs mt-1">Versuche andere Suchbegriffe oder Filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Typ</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stadt</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inhaber</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stories</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kunden</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-charcoal">{r.name}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {RESTAURANT_TYPE_LABELS[r.type] ?? r.type}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{r.city ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {r.owner?.full_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-primary">{r.total_stories}</td>
                    <td className="px-5 py-3.5 text-gray-600">{r.total_customers}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge active={r.is_active} />
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleKundenansicht(r.id, r.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-all hover:opacity-90 active:scale-95"
                        style={{ background: '#FF6B35' }}
                        title="Restaurant-Dashboard öffnen"
                      >
                        <Eye className="w-3 h-3" />
                        Kundenansicht
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
