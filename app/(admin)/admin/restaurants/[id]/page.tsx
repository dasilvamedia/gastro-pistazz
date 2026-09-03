'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Restaurant } from '@/types'
import { RestaurantForm } from '@/components/admin/RestaurantForm'
import { AdminFlagsPanel, GeoPanel, StampCardPanel, PlanPanel, OwnerPanel } from '@/components/admin/restaurant/AdminPanels'

// Super-Admin: EIN Restaurant komplett bearbeiten. Formular ist dasselbe wie
// beim Inhaber (RestaurantForm), plus Admin-Panels (Sichtbarkeit, Slug,
// Koordinaten, Stempelkarte/NFC, Paket, Inhaber-Konto).

type Payload = {
  restaurant: Restaurant
  subscription: Parameters<typeof PlanPanel>[0]['subscription']
  owner: { id: string; full_name: string | null; email: string | null } | null
  nfc_tag_count: number
}

export default function AdminRestaurantEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/restaurants/${id}`)
    if (!res.ok) { toast.error('Restaurant nicht gefunden'); router.replace('/admin/restaurants'); return }
    setData(await res.json())
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  const patch = useCallback(async (payload: Record<string, unknown>): Promise<Restaurant | null> => {
    const res = await fetch(`/api/admin/restaurants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(json.error ?? 'Speichern fehlgeschlagen'); return null }
    setData(d => d ? { ...d, restaurant: json.restaurant } : d)
    return json.restaurant as Restaurant
  }, [id])

  const kundenansicht = () => {
    if (!data) return
    document.cookie = `impersonate_restaurant_id=${data.restaurant.id}; path=/; max-age=3600`
    document.cookie = `impersonate_restaurant_name=${encodeURIComponent(data.restaurant.name)}; path=/; max-age=3600`
    router.push('/dashboard')
  }

  const remove = async () => {
    if (!data || confirmDelete !== data.restaurant.slug) return
    const res = await fetch(`/api/admin/restaurants/${id}?confirm=${encodeURIComponent(confirmDelete)}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Löschen fehlgeschlagen'); return }
    toast.success('Restaurant gelöscht')
    router.replace('/admin/restaurants')
  }

  if (loading || !data) return (
    <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
  )

  const r = data.restaurant

  return (
    <div>
      <div className="px-6 pt-6 max-w-3xl mx-auto flex flex-wrap items-center gap-3">
        <Link href="/admin/restaurants" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1C1F1A]">
          <ChevronLeft size={16} /> Alle Restaurants
        </Link>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {r.is_active ? 'Veröffentlicht' : 'Nicht veröffentlicht'}
        </span>
        <button onClick={kundenansicht} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: '#FF6B35' }}>
          <Eye size={12} /> Kundenansicht
        </button>
      </div>

      <RestaurantForm
        restaurant={r}
        title={r.name}
        hideWarnings
        onSave={patch}
        onPatch={patch}
        extraSections={
          <>
            <AdminFlagsPanel restaurant={r} patch={patch} />
            <GeoPanel restaurant={r} patch={patch} onGeocoded={load} />
            <StampCardPanel restaurant={r} patch={patch} />
            <PlanPanel restaurantId={r.id} subscription={data.subscription} onChanged={load} />
            <OwnerPanel restaurant={r} owner={data.owner} />

            <div className="glass rounded-xl p-5 space-y-3 border border-red-100">
              <h2 className="font-semibold text-red-600 flex items-center gap-2"><Trash2 size={16} /> Restaurant löschen</h2>
              <p className="text-xs text-gray-500">Entfernt Restaurant, Deals, Stempelkarten und Einreichungen endgültig. Zum Bestätigen den Slug <span className="font-mono">{r.slug}</span> eintippen.</p>
              <div className="flex gap-2">
                <input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder={r.slug} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono" />
                <button type="button" onClick={remove} disabled={confirmDelete !== r.slug} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-30">Löschen</button>
              </div>
            </div>
          </>
        }
      />
    </div>
  )
}
