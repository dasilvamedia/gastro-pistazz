'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Star, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Super-Admin: Stempelkarte pro Restaurant ein-/ausschalten und
// konfigurieren. Vorher filterte diese Seite nach owner_id = eigener User
// und war fuer den Super-Admin immer leer.

type Row = {
  id: string
  name: string
  city: string | null
  is_active: boolean
  stamp_card_enabled: boolean
  stamp_card_total: number
  stamp_card_reward: string | null
  tag_count: number
  open_rewards: number
}

export default function AdminStempelkartePage() {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/restaurants')
      if (!res.ok) { toast.error('Restaurants konnten nicht geladen werden'); setLoading(false); return }
      const { restaurants } = await res.json()

      const [{ data: tags }, { data: open }] = await Promise.all([
        supabase.from('nfc_tags').select('restaurant_id'),
        supabase.from('stamp_cards').select('restaurant_id').eq('is_completed', true).eq('reward_redeemed', false),
      ])
      const tagCount = new Map<string, number>()
      for (const t of tags ?? []) tagCount.set(t.restaurant_id, (tagCount.get(t.restaurant_id) ?? 0) + 1)
      const openCount = new Map<string, number>()
      for (const c of open ?? []) openCount.set(c.restaurant_id, (openCount.get(c.restaurant_id) ?? 0) + 1)

      setRows((restaurants as Row[]).map(r => ({
        ...r,
        stamp_card_total: r.stamp_card_total ?? 8,
        tag_count: tagCount.get(r.id) ?? 0,
        open_rewards: openCount.get(r.id) ?? 0,
      })))
      setLoading(false)
    }
    load()
  }, [supabase])

  const patch = async (id: string, fields: Partial<Pick<Row, 'stamp_card_enabled' | 'stamp_card_total' | 'stamp_card_reward'>>) => {
    setSavingId(id)
    const res = await fetch('/api/admin/restaurants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
    setSavingId(null)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Speichern fehlgeschlagen')
      return false
    }
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r))
    return true
  }

  const filtered = rows.filter(r =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.city ?? '').toLowerCase().includes(q.toLowerCase())
  )
  const enabledCount = rows.filter(r => r.stamp_card_enabled).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-[#1C1F1A] flex items-center gap-2"><Star className="text-[#E5B84C]" /> Stempelkarten</h1>
        <span className="text-sm text-gray-500">{enabledCount} von {rows.length} Restaurants aktiv</span>
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Restaurant suchen"
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm bg-white" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className={`glass rounded-xl p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_120px_1fr_auto] gap-3 lg:items-center ${savingId === r.id ? 'opacity-60' : ''}`}>
              <div className="min-w-0">
                <p className="font-semibold text-[#1C1F1A] truncate">{r.name}</p>
                <p className="text-xs text-gray-500">
                  {r.city ?? 'Ohne Stadt'}{!r.is_active ? ', nicht veroeffentlicht' : ''}
                  {`, ${r.tag_count} NFC-Tag${r.tag_count === 1 ? '' : 's'}`}
                  {r.open_rewards > 0 ? `, ${r.open_rewards} offene Belohnung${r.open_rewards === 1 ? '' : 'en'}` : ''}
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.stamp_card_enabled}
                  onClick={() => patch(r.id, { stamp_card_enabled: !r.stamp_card_enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${r.stamp_card_enabled ? 'bg-[#8BB06A]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.stamp_card_enabled ? 'translate-x-6' : ''}`} />
                </button>
                <span className="text-sm text-[#1C1F1A] w-16">{r.stamp_card_enabled ? 'Aktiv' : 'Aus'}</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={20}
                  defaultValue={r.stamp_card_total}
                  onBlur={e => {
                    const v = Math.min(20, Math.max(1, parseInt(e.target.value) || 8))
                    if (v !== r.stamp_card_total) patch(r.id, { stamp_card_total: v })
                  }}
                  className="w-16 px-2 py-2 rounded-lg border border-gray-200 text-sm text-center"
                />
                <span className="text-xs text-gray-500">Stempel</span>
              </div>

              <input
                defaultValue={r.stamp_card_reward ?? ''}
                placeholder="Belohnung, z.B. Ein Dessert gratis"
                maxLength={120}
                onBlur={e => {
                  const v = e.target.value.trim() || null
                  if (v !== (r.stamp_card_reward ?? null)) patch(r.id, { stamp_card_reward: v })
                }}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-full"
              />

              <a href={`/admin/restaurants/${r.id}`} className="text-xs font-medium text-[#6D9450] underline whitespace-nowrap">
                Bearbeiten
              </a>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-10">Kein Restaurant gefunden</p>}
        </div>
      )}
    </div>
  )
}
