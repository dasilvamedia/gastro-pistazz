'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import DealForm from '@/components/admin/DealForm'

export default function NewDealPage() {
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/restaurant').then(r => r.json()).then(({ restaurant: rest }) => {
      if (rest) setRestaurantId(rest.id)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deals" className="text-gray-400 hover:text-[#8BB06A] transition-colors">
          ← Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Neuer Deal</h1>
      </div>
      {loading && <div className="skeleton h-96 rounded-xl" />}
      {!loading && restaurantId && <DealForm restaurantId={restaurantId} />}
      {!loading && !restaurantId && (
        <div className="glass rounded-xl p-6 text-center text-gray-500">
          Kein Restaurant gefunden. Bitte zuerst das Restaurant-Profil einrichten.
        </div>
      )}
    </div>
  )
}
