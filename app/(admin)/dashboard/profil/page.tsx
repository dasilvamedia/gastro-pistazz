'use client'

import { useEffect, useState } from 'react'
import type { Restaurant } from '@/types'
import { RestaurantForm } from '@/components/admin/RestaurantForm'

// Owner-Profil: laedt das eigene Restaurant (oder die Kundenansicht des
// Super-Admins) und speichert ueber /api/dashboard/restaurant.
async function patchRestaurant(payload: Record<string, unknown>): Promise<Restaurant> {
  const res = await fetch('/api/dashboard/restaurant', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Fehler beim Speichern')
  return json.restaurant as Restaurant
}

export default function ProfilPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/restaurant')
      .then(r => r.json())
      .then(({ restaurant: rest }) => { setRestaurant(rest ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
    </div>
  )

  if (!restaurant) return (
    <div className="p-6 text-center text-gray-400">Kein Restaurant mit diesem Konto verknüpft.</div>
  )

  return (
    <RestaurantForm
      restaurant={restaurant}
      onSave={async payload => { const saved = await patchRestaurant(payload); setRestaurant(saved); return saved }}
      onPatch={patchRestaurant}
    />
  )
}
