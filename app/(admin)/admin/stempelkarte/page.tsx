'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Restaurant } from '@/types'

interface StampStats {
  active: number
  completed: number
  redeemed: number
}

export default function StempelkartePage() {
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [stampTotal, setStampTotal] = useState(8)
  const [reward, setReward] = useState('')
  const [stats, setStats] = useState<StampStats>({ active: 0, completed: 0, redeemed: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: rest } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single()
      if (rest) {
        setRestaurant(rest)
        setEnabled(rest.stamp_card_enabled)
        setStampTotal(rest.stamp_card_total || 8)
        setReward(rest.stamp_card_reward ?? '')

        const [activeRes, completedRes, redeemedRes] = await Promise.all([
          supabase.from('stamp_cards').select('id', { count: 'exact', head: true }).eq('restaurant_id', rest.id).eq('is_completed', false),
          supabase.from('stamp_cards').select('id', { count: 'exact', head: true }).eq('restaurant_id', rest.id).eq('is_completed', true),
          supabase.from('stamp_cards').select('id', { count: 'exact', head: true }).eq('restaurant_id', rest.id).eq('reward_redeemed', true),
        ])
        setStats({ active: activeRes.count ?? 0, completed: completedRes.count ?? 0, redeemed: redeemedRes.count ?? 0 })
      }
      setLoading(false)
    })
  }, [supabase])

  const save = async () => {
    if (!restaurant) return
    setSaving(true)
    const { error } = await supabase.from('restaurants').update({
      stamp_card_enabled: enabled,
      stamp_card_total: stampTotal,
      stamp_card_reward: reward,
    }).eq('id', restaurant.id)
    if (error) toast.error('Fehler beim Speichern')
    else toast.success('Stempelkarte gespeichert')
    setSaving(false)
  }

  if (loading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>

  const filledStamps = Math.min(Math.floor(stampTotal / 2), stampTotal)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1C1F1A]">Stempelkarte</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-[#1C1F1A]">Einstellungen</h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              <div className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#8BB06A]' : 'bg-gray-300'}`} />
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${enabled ? 'translate-x-6' : ''}`} />
            </div>
            <span className="text-sm font-medium text-[#1C1F1A]">Stempelkarte {enabled ? 'aktiviert' : 'deaktiviert'}</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">Stempel bis Belohnung</label>
            <input type="number" min={1} max={20} value={stampTotal}
              onChange={e => setStampTotal(parseInt(e.target.value) || 8)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">Belohnung</label>
            <input value={reward} onChange={e => setReward(e.target.value)}
              placeholder="z.B. Ein Dessert gratis"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]" />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full gradient-primary py-3 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="gradient-primary p-4 text-white">
              <p className="text-xs opacity-80 uppercase tracking-wider">Stempelkarte</p>
              <h3 className="text-lg font-bold mt-1">{restaurant?.name ?? 'Dein Restaurant'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[...Array(stampTotal)].map((_, i) => (
                  <div key={i} className={`aspect-square rounded-full border-2 flex items-center justify-center text-lg transition-all ${i < filledStamps ? 'border-[#8BB06A] bg-[#8BB06A]' : 'border-gray-300 bg-white'}`}>
                    {i < filledStamps ? '✓' : ''}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 text-center">
                {stampTotal - filledStamps} Stempel bis zu deiner Belohnung:
              </p>
              <p className="text-center font-semibold text-[#1C1F1A]">{reward || 'Noch keine Belohnung festgelegt'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Aktive Karten', value: stats.active, color: '#8BB06A' },
              { label: 'Abgeschlossen', value: stats.completed, color: '#E5B84C' },
              { label: 'Eingeloest', value: stats.redeemed, color: '#E86B5A' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
