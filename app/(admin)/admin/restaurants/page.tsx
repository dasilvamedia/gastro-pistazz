'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, RefreshCw, Eye, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { PLANS, STATUS_LABEL, type PlanKey, type SubscriptionStatus } from '@/lib/plans'

interface SubInfo {
  plan: PlanKey
  status: SubscriptionStatus
  trial_days_remaining: number
  is_trial_active: boolean
  is_trial_expired: boolean
  monthly_fee: number
}

interface RestaurantRow {
  id: string
  slug: string | null
  name: string
  type: string
  city: string | null
  total_stories: number
  total_customers: number
  is_active: boolean
  is_verified: boolean
  owner_name: string | null
  owner_id: string | null
  sub: SubInfo | null
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  cafe: 'Café',
  fine_dining: 'Fine Dining',
  biergarten: 'Biergarten',
  eisdiele: 'Eisdiele',
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`h-12 bg-gray-100 rounded-lg animate-pulse ${className}`} />
}

function StatusToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={active ? 'Klicken zum Deaktivieren' : 'Klicken zum Aktivieren'}
      className="inline-flex items-center gap-2"
    >
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${active ? 'bg-green-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${active ? 'left-5' : 'left-0.5'}`} />
      </div>
      <span className={`text-xs font-semibold whitespace-nowrap ${active ? 'text-green-700' : 'text-gray-400'}`}>
        {active ? 'Sichtbar' : 'Versteckt'}
      </span>
    </button>
  )
}

function TrialBadge({ sub }: { sub: SubInfo | null }) {
  if (!sub) return <span className="text-xs text-gray-300">—</span>
  const s = STATUS_LABEL[sub.status]
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
        style={{ color: s.color, background: s.bg }}
      >
        {s.emoji} {s.label}
      </span>
      {sub.is_trial_active && (
        <span className={`text-xs font-medium ${sub.trial_days_remaining <= 3 ? 'text-red-500' : 'text-gray-400'}`}>
          ⏳ {sub.trial_days_remaining}d verbleibend
        </span>
      )}
      {sub.status !== 'trial' && (
        <span className="text-xs text-gray-400">{PLANS[sub.plan]?.name ?? sub.plan}</span>
      )}
    </div>
  )
}

export default function AdminRestaurantsPage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterTrial, setFilterTrial] = useState<'all' | SubscriptionStatus>('all')
  const [cities, setCities] = useState<string[]>([])
  const [toggling, setToggling] = useState<string | null>(null)

  const loadRestaurants = useCallback(async () => {
    setLoading(true)
    try {
      const [restRes, subRes] = await Promise.all([
        fetch('/api/admin/restaurants'),
        fetch('/api/admin/subscriptions'),
      ])
      if (!restRes.ok) throw new Error(`Restaurants API ${restRes.status}`)
      const restData = await restRes.json()
      const subData = subRes.ok ? await subRes.json() : { subscriptions: [] }

      const subMap: Record<string, SubInfo> = {}
      for (const s of (subData.subscriptions ?? [])) {
        subMap[s.restaurant_id] = {
          plan: s.plan,
          status: s.status,
          trial_days_remaining: s.trial_days_remaining ?? 0,
          is_trial_active: s.is_trial_active ?? false,
          is_trial_expired: s.is_trial_expired ?? false,
          monthly_fee: s.monthly_fee ?? 0,
        }
      }

      const rows: RestaurantRow[] = (restData.restaurants ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        slug: r.slug as string | null,
        name: r.name as string,
        type: r.type as string,
        city: r.city as string | null,
        total_stories: (r.total_stories as number) ?? 0,
        total_customers: (r.total_customers as number) ?? 0,
        is_active: r.is_active as boolean,
        is_verified: r.is_verified as boolean,
        owner_name: r.owner_name as string | null,
        owner_id: r.owner_id as string | null,
        sub: subMap[r.id as string] ?? null,
      }))

      const allCities = Array.from(new Set(rows.map((r) => r.city).filter(Boolean))) as string[]
      setCities(allCities)
      setRestaurants(rows)
    } catch (err) {
      console.error(err)
      toast.error('Fehler beim Laden der Restaurants')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRestaurants() }, [loadRestaurants])

  const handleToggleActive = async (restaurantId: string, currentActive: boolean) => {
    setToggling(restaurantId)
    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: restaurantId, is_active: !currentActive }),
      })
      if (!res.ok) throw new Error()
      setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, is_active: !currentActive } : r))
      toast.success(!currentActive ? 'Restaurant aktiviert' : 'Restaurant deaktiviert')
    } catch {
      toast.error('Fehler beim Ändern des Status')
    } finally {
      setToggling(null)
    }
  }

  const handleKundenansicht = (restaurantId: string, restaurantName: string) => {
    document.cookie = `impersonate_restaurant_id=${restaurantId}; path=/; max-age=3600`
    document.cookie = `impersonate_restaurant_name=${encodeURIComponent(restaurantName)}; path=/; max-age=3600`
    router.push('/dashboard')
  }

  const filtered = restaurants.filter((r) => {
    if (filterStatus === 'active' && !r.is_active) return false
    if (filterStatus === 'inactive' && r.is_active) return false
    if (filterTrial !== 'all') {
      if (!r.sub) return false
      if (r.sub.status !== filterTrial) return false
    }
    if (filterCity && r.city !== filterCity) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.name.toLowerCase().includes(q) && !(r.city ?? '').toLowerCase().includes(q) && !(r.owner_name ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const trialCount = restaurants.filter(r => r.sub?.is_trial_active).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-charcoal">Alle Restaurants</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {restaurants.length} Restaurants gesamt
            {trialCount > 0 && <span className="ml-2 text-[#3D7A22] font-medium">· 🧪 {trialCount} in Testphase</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRestaurants}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <Link
            href="/admin/restaurants/neu"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Neues Restaurant
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Name, Stadt oder Inhaber suchen..."
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
          <option value="all">Sichtbarkeit: Alle</option>
          <option value="active">Sichtbar</option>
          <option value="inactive">Versteckt</option>
        </select>

        <select
          value={filterTrial}
          onChange={(e) => setFilterTrial(e.target.value as typeof filterTrial)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Abo: Alle</option>
          <option value="trial">🧪 Testphase</option>
          <option value="active">✅ Aktiv (zahlend)</option>
          <option value="expired">🔴 Abgelaufen</option>
          <option value="cancelled">⛔ Gekündigt</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} />
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
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Typ / Stadt</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inhaber</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stories</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kunden</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Abo / Testphase</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sichtbar</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-charcoal">{r.name}</span>
                      {r.is_verified && <span className="ml-1.5 text-[10px] text-blue-500 font-semibold">✓ verifiziert</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-500">{TYPE_LABELS[r.type] ?? r.type}</span>
                      {r.city && <span className="block text-xs text-gray-400">{r.city}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {r.owner_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-primary">{r.total_stories}</td>
                    <td className="px-5 py-3.5 text-gray-600">{r.total_customers}</td>
                    <td className="px-5 py-3.5">
                      <TrialBadge sub={r.sub} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusToggle
                        active={r.is_active}
                        onClick={() => !toggling && handleToggleActive(r.id, r.is_active)}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleKundenansicht(r.id, r.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-all hover:opacity-90 active:scale-95"
                          style={{ background: '#FF6B35' }}
                          title="Dashboard als Inhaber öffnen"
                        >
                          <Eye className="w-3 h-3" />
                          Ansicht
                        </button>
                        <Link
                          href={`/admin/accounts?restaurant=${r.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                          title="Account bearbeiten"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Pencil className="w-3 h-3" />
                          Konto
                        </Link>
                      </div>
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
