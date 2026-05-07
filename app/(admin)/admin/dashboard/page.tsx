'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Store, Users, ImageIcon, Tag, TrendingUp, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface KpiData {
  restaurants: number
  guests: number
  stories: number
  deals: number
  monthlyRevenue: number
}

interface RestaurantRow {
  id: string
  name: string
  city: string | null
  total_stories: number
  total_customers: number
  is_active: boolean
  is_verified: boolean
  type: string
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  loading: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-24 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-charcoal mt-0.5">{value}</p>
        )}
      </div>
    </div>
  )
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

export default function SuperAdminDashboard() {
  const supabase = createClient()
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [
          { count: restaurantCount },
          { count: guestCount },
          { count: storyCount },
          { count: dealCount },
          { data: restaurantRows },
        ] = await Promise.all([
          supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'guest'),
          supabase.from('story_submissions').select('*', { count: 'exact', head: true }),
          supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase
            .from('restaurants')
            .select('id, name, city, total_stories, total_customers, is_active, is_verified, type')
            .order('total_stories', { ascending: false })
            .limit(10),
        ])

        setKpi({
          restaurants: restaurantCount ?? 0,
          guests: guestCount ?? 0,
          stories: storyCount ?? 0,
          deals: dealCount ?? 0,
          monthlyRevenue: 0,
        })

        setRestaurants(restaurantRows ?? [])
      } catch {
        toast.error('Fehler beim Laden der Dashboard-Daten')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <span className="text-3xl" aria-hidden>🧑‍💼</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard
          label="Restaurants"
          value={kpi?.restaurants ?? 0}
          icon={Store}
          color="bg-primary"
          loading={loading}
        />
        <KpiCard
          label="Gäste"
          value={kpi?.guests ?? 0}
          icon={Users}
          color="bg-blue-500"
          loading={loading}
        />
        <KpiCard
          label="Stories"
          value={kpi?.stories ?? 0}
          icon={ImageIcon}
          color="bg-purple-500"
          loading={loading}
        />
        <KpiCard
          label="Aktive Deals"
          value={kpi?.deals ?? 0}
          icon={Tag}
          color="bg-amber-500"
          loading={loading}
        />
        <KpiCard
          label="Monatsumsatz"
          value={`€${(kpi?.monthlyRevenue ?? 0).toLocaleString('de-DE')}`}
          icon={TrendingUp}
          color="bg-emerald-600"
          loading={loading}
        />
      </div>

      {/* Restaurant Performance Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-charcoal">Top Restaurants nach Stories</h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="p-12 text-center">
            <Store className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Noch keine Restaurants vorhanden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stadt</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stories</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kunden</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {restaurants.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-6 py-3.5 font-medium text-charcoal">{r.name}</td>
                    <td className="px-6 py-3.5 text-gray-500">{r.city ?? '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-primary">{r.total_stories}</span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{r.total_customers}</td>
                    <td className="px-6 py-3.5">
                      <StatusBadge active={r.is_active} />
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
