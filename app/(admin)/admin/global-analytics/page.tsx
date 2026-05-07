'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, ImageIcon, Users, Store } from 'lucide-react'
import toast from 'react-hot-toast'

type Range = '7d' | '30d' | '90d'

interface DailyStories {
  date: string
  count: number
}

interface TopRestaurant {
  id: string
  name: string
  city: string | null
  total_stories: number
  total_customers: number
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'Letzte 7 Tage',
  '30d': 'Letzte 30 Tage',
  '90d': 'Letzte 90 Tage',
}

export default function GlobalAnalyticsPage() {
  const supabase = createClient()
  const [range, setRange] = useState<Range>('30d')
  const [loading, setLoading] = useState(true)
  const [storyData, setStoryData] = useState<DailyStories[]>([])
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurant[]>([])
  const [totalStories, setTotalStories] = useState(0)
  const [totalGuests, setTotalGuests] = useState(0)
  const [totalRestaurants, setTotalRestaurants] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
      const since = new Date()
      since.setDate(since.getDate() - days)
      const sinceIso = since.toISOString()

      const [
        { data: stories },
        { data: restaurants },
        { count: guestCount },
        { count: storyCount },
        { count: restaurantCount },
      ] = await Promise.all([
        supabase
          .from('story_submissions')
          .select('created_at')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: true }),
        supabase
          .from('restaurants')
          .select('id, name, city, total_stories, total_customers')
          .eq('is_active', true)
          .order('total_stories', { ascending: false })
          .limit(10),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'guest'),
        supabase.from('story_submissions').select('*', { count: 'exact', head: true }).gte('created_at', sinceIso),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ])

      // Group stories by day
      const grouped: Record<string, number> = {}
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        grouped[key] = 0
      }
      ;(stories ?? []).forEach((s: { created_at: string }) => {
        const d = new Date(s.created_at)
        const key = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        if (key in grouped) grouped[key] = (grouped[key] ?? 0) + 1
      })
      setStoryData(Object.entries(grouped).map(([date, count]) => ({ date, count })))

      setTopRestaurants((restaurants ?? []) as TopRestaurant[])
      setTotalGuests(guestCount ?? 0)
      setTotalStories(storyCount ?? 0)
      setTotalRestaurants(restaurantCount ?? 0)
    } catch {
      toast.error('Fehler beim Laden der Analytics')
    } finally {
      setLoading(false)
    }
  }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-charcoal">Global Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plattform-Übersicht – alle Restaurants</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                range === r ? 'bg-white shadow-sm text-charcoal' : 'text-gray-500 hover:text-charcoal'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Stories im Zeitraum', value: totalStories, icon: ImageIcon, color: 'bg-purple-500' },
          { label: 'Registrierte Gäste', value: totalGuests, icon: Users, color: 'bg-blue-500' },
          { label: 'Aktive Restaurants', value: totalRestaurants, icon: Store, color: 'bg-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              {loading ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-charcoal">{value.toLocaleString('de-DE')}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Story Area Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-charcoal">Stories über Zeit (alle Restaurants)</h2>
          <span className="text-xs text-gray-400 ml-auto">{RANGE_LABELS[range]}</span>
        </div>
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={storyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="globalStoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8BB06A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8BB06A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(storyData.length / 6) - 1)}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8BB06A"
                strokeWidth={2.5}
                fill="url(#globalStoryGradient)"
                name="Stories"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-charcoal mb-5">Top Restaurants nach Stories</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : topRestaurants.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-300 text-sm">Keine Daten</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topRestaurants.slice(0, 6)}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey="total_stories" fill="#8BB06A" radius={[0, 6, 6, 0]} name="Stories" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rangliste */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-charcoal">Restaurant-Rangliste</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : topRestaurants.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Keine Restaurants vorhanden</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Stories</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Kunden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topRestaurants.map((r, i) => (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-charcoal text-sm">{r.name}</td>
                      <td className="px-5 py-3 text-right font-semibold text-primary">{r.total_stories}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{r.total_customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
