'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Trophy, Camera, Gift, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRestaurant } from '@/lib/hooks/useRestaurant'
import { TIER_CONFIG } from '@/types'
import type { Profile, StorySubmission, DealRedemption, PointsTransaction, Visit } from '@/types'
import { formatDate, timeAgo, formatPoints } from '@/lib/utils'

type Tab = 'punkte' | 'stories' | 'deals' | 'besuche'

export default function KundeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { restaurant } = useRestaurant()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('punkte')
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [stories, setStories] = useState<StorySubmission[]>([])
  const [redemptions, setRedemptions] = useState<DealRedemption[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!params.id) return
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [params.id])

  useEffect(() => {
    const loadTabData = async () => {
      if (!params.id || !restaurant) return
      const supabase = createClient()

      if (activeTab === 'punkte') {
        const { data } = await supabase
          .from('points_transactions')
          .select('*')
          .eq('user_id', params.id)
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false })
          .limit(20)
        setTransactions(data || [])
      } else if (activeTab === 'stories') {
        const { data } = await supabase
          .from('story_submissions')
          .select('*')
          .eq('user_id', params.id)
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false })
        setStories(data || [])
      } else if (activeTab === 'deals') {
        const { data } = await supabase
          .from('deal_redemptions')
          .select('*, deal:deals(title)')
          .eq('user_id', params.id)
          .eq('restaurant_id', restaurant.id)
          .order('redeemed_at', { ascending: false })
        setRedemptions(data || [])
      } else if (activeTab === 'besuche') {
        const { data } = await supabase
          .from('visits')
          .select('*')
          .eq('user_id', params.id)
          .eq('restaurant_id', restaurant.id)
          .order('visited_at', { ascending: false })
        setVisits(data || [])
      }
    }
    loadTabData()
  }, [activeTab, params.id, restaurant])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'punkte', label: 'Punkte-Verlauf', icon: <Trophy size={14} /> },
    { key: 'stories', label: 'Stories', icon: <Camera size={14} /> },
    { key: 'deals', label: 'Deals', icon: <Gift size={14} /> },
    { key: 'besuche', label: 'Besuche', icon: <Star size={14} /> },
  ]

  if (loading || !profile) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const tier = TIER_CONFIG[profile.tier]
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || profile.email[0].toUpperCase()

  return (
    <div className="p-6 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard/kunden')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Zurück zur Übersicht
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #8BB06A, #6D9450)' }}
          >
            {initials}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{profile.full_name || 'Unbekannt'}</h2>
          <p className="text-sm text-gray-500 mb-3">{profile.email}</p>
          <span
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white mb-4"
            style={{ backgroundColor: tier.color }}
          >
            {tier.label}
          </span>

          <div className="border-t pt-4 space-y-2 text-sm text-left">
            {profile.city && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={14} /> {profile.city}
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} /> {profile.phone}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Mail size={14} /> {profile.email}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{formatPoints(profile.total_points)}</div>
              <div className="text-xs text-gray-500">Punkte</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{profile.total_stories}</div>
              <div className="text-xs text-gray-500">Stories</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{profile.total_visits}</div>
              <div className="text-xs text-gray-500">Besuche</div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex border-b">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? 'text-[#8BB06A] border-b-2 border-[#8BB06A]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {activeTab === 'punkte' && transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{tx.description || tx.type}</div>
                  <div className="text-xs text-gray-400">{timeAgo(tx.created_at)}</div>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'earned' || tx.type === 'bonus' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'earned' || tx.type === 'bonus' ? '+' : '-'}{tx.amount}P
                </span>
              </div>
            ))}

            {activeTab === 'stories' && stories.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{s.type.replace('_', ' ')}</div>
                  <div className="text-xs text-gray-400">{formatDate(s.created_at)}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.status === 'approved' ? 'bg-green-100 text-green-700' :
                  s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {s.status === 'approved' ? 'Genehmigt' : s.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                </span>
              </div>
            ))}

            {activeTab === 'deals' && redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{(r as any).deal?.title || 'Deal'}</div>
                  <div className="text-xs text-gray-400 font-mono">{r.redemption_code}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === 'used' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}

            {activeTab === 'besuche' && visits.map(v => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="text-sm font-medium text-gray-800">{formatDate(v.visited_at)}</div>
                <span className="text-xs text-gray-500">{v.source}</span>
              </div>
            ))}

            {((activeTab === 'punkte' && transactions.length === 0) ||
              (activeTab === 'stories' && stories.length === 0) ||
              (activeTab === 'deals' && redemptions.length === 0) ||
              (activeTab === 'besuche' && visits.length === 0)) && (
              <div className="text-center py-12 text-gray-400 text-sm">Keine Einträge vorhanden</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
