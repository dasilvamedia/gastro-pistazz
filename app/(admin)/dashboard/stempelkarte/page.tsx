'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { PlanGate } from '@/components/admin/PlanGate'
import { Restaurant } from '@/types'

interface StampStats {
  active: number
  completed: number
  redeemed: number
}

interface NfcTag {
  id: string
  tag_uid: string
  label: string | null
  created_at: string
}

function NfcTagsSection() {
  const [tags, setTags] = useState<NfcTag[]>([])
  // In der App: Tag direkt scannen statt UID per Fremd-App abtippen
  const [nfcScanBusy, setNfcScanBusy] = useState(false)
  const nativeNfc = typeof window !== 'undefined'
    ? (window as unknown as { Capacitor?: { Plugins?: { NfcStamp?: { scan: () => Promise<{ uid: string }> } } } }).Capacitor?.Plugins?.NfcStamp
    : undefined
  const scanTagUid = async () => {
    if (!nativeNfc || nfcScanBusy) return
    setNfcScanBusy(true)
    try {
      const { uid } = await nativeNfc.scan()
      setNewUid(uid)
      toast.success('Tag gelesen! UID übernommen.')
    } catch { /* Nutzer hat abgebrochen oder Lesefehler */ }
    setNfcScanBusy(false)
  }
  const [loading, setLoading] = useState(true)
  const [newUid, setNewUid] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)

  const load = () => {
    fetch('/api/nfc/tags').then(r => r.json()).then(d => setTags(d.tags ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const addTag = async () => {
    if (!newUid.trim()) { toast.error('Tag-UID fehlt'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/nfc/tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_uid: newUid.trim(), label: newLabel.trim() || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Tag registriert')
      setNewUid(''); setNewLabel('')
      load()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Fehler') }
    finally { setAdding(false) }
  }

  const removeTag = async (id: string) => {
    await fetch('/api/nfc/tags', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTags(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-[#1C1F1A]">NFC-Tags (Stempel per Antippen)</h2>
        <p className="text-xs text-gray-500 mt-1">
          Registriere hier die physischen NFC-Karten/-Tags in deinem Restaurant. In der App einfach
          auf „Tag scannen“ tippen und den Tag ans Handy halten, die UID wird automatisch übernommen.
          Danach vergibt jedes Antippen durch Gäste automatisch einen Stempel, ganz ohne Foto oder Link.
        </p>
      </div>

      {nativeNfc && (
        <button
          onClick={scanTagUid}
          disabled={nfcScanBusy}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg border-2 border-[#8BB06A] text-[#577A3D] text-sm font-bold disabled:opacity-50"
        >
          {nfcScanBusy ? 'Halte den Tag ans Handy…' : '📶 Tag scannen (UID automatisch lesen)'}
        </button>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={newUid}
          onChange={e => setNewUid(e.target.value)}
          placeholder="Tag-UID (z.B. 04A2B3C4D5)"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]"
        />
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Bezeichnung (optional, z.B. Theke)"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]"
        />
        <button onClick={addTag} disabled={adding}
          className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium disabled:opacity-50 shrink-0">
          {adding ? 'Speichern...' : 'Tag hinzufügen'}
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-16 rounded-lg" />
      ) : tags.length === 0 ? (
        <p className="text-sm text-gray-400">Noch keine NFC-Tags registriert.</p>
      ) : (
        <div className="space-y-2">
          {tags.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-100 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1C1F1A] truncate">{t.label || 'Unbenannter Tag'}</p>
                <p className="text-xs text-gray-400 font-mono truncate">{t.tag_uid}</p>
              </div>
              <button onClick={() => removeTag(t.id)} className="text-xs text-red-500 font-medium shrink-0 hover:underline">
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StempelkarteContent() {
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [stampTotal, setStampTotal] = useState(8)
  const [reward, setReward] = useState('')
  const [stats, setStats] = useState<StampStats>({ active: 0, completed: 0, redeemed: 0 })

  useEffect(() => {
    fetch('/api/dashboard/restaurant').then(r => r.json()).then(async ({ restaurant: rest }) => {
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
    }).catch(() => setLoading(false))
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

          <NfcTagsSection />
        </div>
      </div>
    </div>
  )
}

export default function StempelkartePage() {
  return (
    <PlanGate feature="has_stempelkarte">
      <StempelkarteContent />
    </PlanGate>
  )
}
