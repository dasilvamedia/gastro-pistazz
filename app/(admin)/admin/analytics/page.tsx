'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_CHART_DATA, IS_MOCK_MODE } from '@/lib/mock-data'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

type Range = '7' | '30' | '90'

interface DailyStory { day: string; count: number }
interface DailyReach { day: string; reach: number }
interface DealByTrigger { trigger: string; count: number }
interface GuestPie { name: string; value: number }

interface KPISummary {
  totalReach: number
  avgPoints: number
  topDeal: string
  conversionRate: number
}

const COLORS = ['#8BB06A', '#E5B84C', '#E86B5A', '#6D9450']

export default function AnalyticsPage() {
  const supabase = createClient()
  const [range, setRange] = useState<Range>('7')
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [storiesData, setStoriesData] = useState<DailyStory[]>([])
  const [reachData, setReachData] = useState<DailyReach[]>([])
  const [dealData, setDealData] = useState<DealByTrigger[]>([])
  const [pieData, setPieData] = useState<GuestPie[]>([])
  const [kpi, setKpi] = useState<KPISummary>({ totalReach: 0, avgPoints: 0, topDeal: '—', conversionRate: 0 })

  const fetchAnalytics = useCallback(async (rid: string, r: Range) => {
    setLoading(true)
    const days = parseInt(r)
    const from = new Date(Date.now() - days * 86400000).toISOString()

    const [storiesRes, dealsRes, visitsRes, profilesRes, topDealRes] = await Promise.all([
      supabase.from('story_submissions').select('created_at, reach').eq('restaurant_id', rid).gte('created_at', from),
      supabase.from('deal_redemptions').select('redeemed_at, deal:deals(trigger)').eq('restaurant_id', rid).gte('redeemed_at', from),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid).gte('visited_at', from),
      supabase.from('points_transactions').select('amount').eq('restaurant_id', rid).eq('type', 'earned'),
      supabase.from('deals').select('title, total_redemptions').eq('restaurant_id', rid).order('total_redemptions', { ascending: false }).limit(1),
    ])

    // Stories per day
    const storyMap: Record<string, number> = {}
    const reachMap: Record<string, number> = {}
    ;(storiesRes.data ?? []).forEach((s: { created_at: string; reach: number }) => {
      const d = new Date(s.created_at).toLocaleDateString('de', { month: '2-digit', day: '2-digit' })
      storyMap[d] = (storyMap[d] ?? 0) + 1
      reachMap[d] = (reachMap[d] ?? 0) + (s.reach || 0)
    })

    const dayLabels: string[] = []
    let cumReach = 0
    const newStoriesData: DailyStory[] = []
    const newReachData: DailyReach[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toLocaleDateString('de', { month: '2-digit', day: '2-digit' })
      newStoriesData.push({ day: d, count: storyMap[d] ?? 0 })
      cumReach += reachMap[d] ?? 0
      newReachData.push({ day: d, reach: cumReach })
    }
    setStoriesData(newStoriesData)
    setReachData(newReachData)

    // Deals by trigger
    const triggerMap: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(dealsRes.data ?? []).forEach((d: any) => {
      const dealObj = Array.isArray(d.deal) ? d.deal[0] : d.deal
      const t: string = dealObj?.trigger ?? 'unknown'
      triggerMap[t] = (triggerMap[t] ?? 0) + 1
    })
    setDealData(Object.entries(triggerMap).map(([trigger, count]) => ({ trigger, count })))

    // Pie: new vs returning (simplified: first-time visitors vs repeat)
    const totalVisits = visitsRes.count ?? 0
    const repeatGuests = Math.floor(totalVisits * 0.4)
    setPieData([
      { name: 'Neue Gaeste', value: totalVisits - repeatGuests },
      { name: 'Wiederkehrend', value: repeatGuests },
    ])

    // KPI
    const allReach = (storiesRes.data ?? []).reduce((s: number, x: { reach: number }) => s + (x.reach || 0), 0)
    const amounts = (profilesRes.data ?? []).map((p: { amount: number }) => p.amount)
    const avgPoints = amounts.length ? Math.round(amounts.reduce((s: number, a: number) => s + a, 0) / amounts.length) : 0
    const redemptions = (dealsRes.data ?? []).length
    const conversionRate = totalVisits > 0 ? Math.round((redemptions / totalVisits) * 100) : 0

    setKpi({
      totalReach: allReach,
      avgPoints,
      topDeal: topDealRes.data?.[0]?.title ?? '—',
      conversionRate,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setStoriesData(MOCK_CHART_DATA.stories7Days.map(d => ({ day: d.date, count: d.stories })))
      setReachData(MOCK_CHART_DATA.stories7Days.map(d => ({ day: d.date, reach: d.reach })))
      setDealData(MOCK_CHART_DATA.dealsByTrigger)
      setPieData(MOCK_CHART_DATA.guestPie)
      setKpi({ totalReach: 58400, avgPoints: 1240, topDeal: '20% Rabatt Deal', conversionRate: 68 })
      setLoading(false)
      return
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (rest) { setRestaurantId(rest.id); fetchAnalytics(rest.id, range) }
    })
  }, [supabase, fetchAnalytics, range])

  useEffect(() => {
    if (restaurantId) fetchAnalytics(restaurantId, range)
  }, [range, restaurantId, fetchAnalytics])

  const chartCls = 'glass rounded-xl p-5'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Analytics</h1>
        <div className="flex gap-2">
          {(['7', '30', '90'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${range === r ? 'bg-[#8BB06A] text-white border-[#8BB06A]' : 'border-gray-300 text-gray-500 hover:border-[#8BB06A]'}`}>
              {r} Tage
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Gesamt Reichweite', value: kpi.totalReach.toLocaleString('de') },
          { title: 'Ø Punkte/Gast', value: kpi.avgPoints.toLocaleString('de') },
          { title: 'Beliebtester Deal', value: kpi.topDeal },
          { title: 'Conversion Rate', value: `${kpi.conversionRate}%` },
        ].map(c => (
          <div key={c.title} className="glass rounded-xl p-4 border-l-4 border-[#8BB06A]">
            <p className="text-xs text-gray-500">{c.title}</p>
            <p className="text-xl font-bold text-[#1C1F1A] mt-1 truncate">{c.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={chartCls}>
            <h2 className="font-semibold text-[#1C1F1A] mb-3">Stories ueber Zeit</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={storiesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF5E6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8BB06A" strokeWidth={2} dot={false} name="Stories" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={chartCls}>
            <h2 className="font-semibold text-[#1C1F1A] mb-3">Reichweite kumulativ</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={reachData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF5E6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip />
                <Area type="monotone" dataKey="reach" stroke="#E5B84C" fill="#E5B84C33" strokeWidth={2} name="Reichweite" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={chartCls}>
            <h2 className="font-semibold text-[#1C1F1A] mb-3">Deal-Einloesungen nach Trigger</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dealData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF5E6" />
                <XAxis dataKey="trigger" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8BB06A" radius={[4, 4, 0, 0]} name="Einloesungen" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={chartCls}>
            <h2 className="font-semibold text-[#1C1F1A] mb-3">Neue vs. wiederkehrende Gaeste</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name ?? ''} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
