'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { StorySubmission } from '@/types'
import toast from 'react-hot-toast'
import { RefreshCw, Store } from 'lucide-react'

interface KPI {
  storiesCount: number
  totalReach: number
  dealsRedeemed: number
  newCustomers: number
  activeStampCards: number
  pointsGiven: number
}

interface ChartDay {
  day: string
  Stories: number
  Reichweite: number
}

interface Restaurant {
  id: string
  name: string
  slug: string
  city: string
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'gerade eben'
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`
  return `vor ${Math.floor(diff / 86400)} Tagen`
}

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export default function DashboardPage() {
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [kpi, setKpi] = useState<KPI>({ storiesCount: 0, totalReach: 0, dealsRedeemed: 0, newCustomers: 0, activeStampCards: 0, pointsGiven: 0 })
  const [chartData, setChartData] = useState<ChartDay[]>([])
  const [activities, setActivities] = useState<(StorySubmission & { user: { full_name: string | null } | null })[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (rid: string) => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    const [storiesRes, reachRes, dealsRes, customersRes, activitiesRes, stampRes, pointsRes] = await Promise.all([
      supabase.from('story_submissions').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', rid).gte('created_at', weekAgo),
      supabase.from('story_submissions').select('reach')
        .eq('restaurant_id', rid).eq('status', 'approved'),
      supabase.from('deal_redemptions').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', rid),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase.from('story_submissions').select('*, user:profiles(full_name)')
        .eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(10),
      supabase.from('stamp_cards').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', rid),
      supabase.from('points_transactions').select('points')
        .eq('restaurant_id', rid).gte('created_at', weekAgo),
    ])

    const totalReach = (reachRes.data ?? []).reduce((s: number, r: { reach: number }) => s + (r.reach || 0), 0)
    const totalPoints = (pointsRes.data ?? []).reduce((s: number, r: { points: number }) => s + (r.points || 0), 0)

    setKpi({
      storiesCount: storiesRes.count ?? 0,
      totalReach,
      dealsRedeemed: dealsRes.count ?? 0,
      newCustomers: customersRes.count ?? 0,
      activeStampCards: stampRes.count ?? 0,
      pointsGiven: totalPoints,
    })

    const acts = (activitiesRes.data ?? []) as (StorySubmission & { user: { full_name: string | null } | null })[]
    setActivities(acts)
    setPendingCount(acts.filter(a => a.status === 'pending').length)

    // Chart: last 7 days
    const days: ChartDay[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      days.push({ day: DAY_LABELS[d.getDay()], Stories: 0, Reichweite: 0 })
    }

    const storiesChartRes = await supabase.from('story_submissions')
      .select('created_at, reach').eq('restaurant_id', rid).gte('created_at', weekAgo)

    ;(storiesChartRes.data ?? []).forEach((s: { created_at: string; reach: number }) => {
      const label = DAY_LABELS[new Date(s.created_at).getDay()]
      const entry = days.find(x => x.day === label)
      if (entry) { entry.Stories += 1; entry.Reichweite += s.reach || 0 }
    })
    setChartData(days)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    async function init() {
      try {
        // Use API route (admin client) — works regardless of RLS
        const res = await fetch('/api/dashboard/restaurant')
        if (!res.ok) {
          if (res.status === 401) {
            setError('Nicht eingeloggt')
          } else {
            setError('Fehler beim Laden')
          }
          setLoading(false)
          return
        }
        const { restaurant: rest } = await res.json()
        if (!rest) {
          setError('Kein Restaurant für diesen Account gefunden')
          setLoading(false)
          return
        }
        setRestaurant(rest)
        await fetchData(rest.id)
      } catch (e) {
        setError('Verbindungsfehler')
        setLoading(false)
      }
    }
    init()
  }, [fetchData])

  // Real-time subscriptions — fires when ANY relevant table changes
  useEffect(() => {
    if (!restaurant) return
    const rid = restaurant.id

    const channel = supabase
      .channel(`dashboard-${rid}`)
      // ── Restaurant profile changes (name, logo, cover, etc.) ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurants',
        filter: `id=eq.${rid}`,
      }, (payload) => {
        // Update local restaurant state so header/name reflect immediately
        setRestaurant(prev => prev ? { ...prev, ...(payload.new as Partial<Restaurant>) } : prev)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_submissions',
        filter: `restaurant_id=eq.${rid}`,
      }, () => { fetchData(rid); toast('Neue Story-Aktivität', { icon: '📸' }) })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deal_redemptions',
        filter: `restaurant_id=eq.${rid}`,
      }, () => { fetchData(rid); toast('Deal eingelöst!', { icon: '🎉' }) })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stamp_cards',
        filter: `restaurant_id=eq.${rid}`,
      }, () => { fetchData(rid); toast('Stempelkarte aktualisiert', { icon: '⭐' }) })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'points_transactions',
        filter: `restaurant_id=eq.${rid}`,
      }, () => { fetchData(rid); toast('Punkte vergeben', { icon: '🏆' }) })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurant, fetchData, supabase])

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
      <p className="text-center text-sm text-gray-400">Lade Restaurant-Daten…</p>
    </div>
  )

  if (error) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Store className="w-12 h-12 text-gray-300" />
      <p className="text-gray-500 text-sm">{error}</p>
      <button
        onClick={() => { setLoading(true); setError(null); }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8BB06A] text-white text-sm"
      >
        <RefreshCw className="w-4 h-4" /> Erneut laden
      </button>
    </div>
  )

  const kpiCards = [
    { title: 'Stories diese Woche', value: kpi.storiesCount, icon: '📸', sub: `${kpi.totalReach.toLocaleString('de')} Personen erreicht` },
    { title: 'Eingelöste Deals', value: kpi.dealsRedeemed, icon: '🎉', sub: 'Gesamt' },
    { title: 'Aktive Stempelkarten', value: kpi.activeStampCards, icon: '⭐', sub: `${kpi.pointsGiven} Punkte diese Woche` },
    { title: 'Neue Kunden', value: kpi.newCustomers, icon: '👥', sub: 'Diese Woche' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1F1A]">{restaurant?.name}</h1>
          <p className="text-sm text-gray-400">{restaurant?.city} · Live Dashboard</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/stories"
            className="relative flex items-center gap-2 px-4 py-2 rounded-lg border border-[#8BB06A] text-[#8BB06A] hover:bg-[#EEF5E6] text-sm font-medium transition-colors"
          >
            Story prüfen
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingCount}</span>
            )}
          </Link>
          <Link
            href="/dashboard/deals"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors"
          >
            + Deal erstellen
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-l-4 border-l-[#8BB06A]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.title}</p>
                <p className="text-3xl font-bold text-[#1C1F1A] mt-1">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-base font-semibold text-[#1C1F1A] mb-4">Letzte 7 Tage</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Stories" fill="#8BB06A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Reichweite" fill="#E5B84C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#1C1F1A]">Live Aktivität</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Echtzeit
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-72">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Noch keine Aktivitäten</p>
            ) : activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#8BB06A]/20 flex items-center justify-center text-[#8BB06A] text-sm font-bold flex-shrink-0">
                  {(a.user?.full_name ?? 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1C1F1A] truncate">{a.user?.full_name ?? 'Unbekannt'}</p>
                  <p className="text-xs text-gray-500">hat eine Story eingereicht</p>
                  <p className="text-xs text-gray-400">{timeAgo(a.created_at)}</p>
                </div>
                {a.status === 'pending' && (
                  <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full flex-shrink-0">Ausstehend</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
