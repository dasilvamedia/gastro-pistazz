'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Deal } from '@/types'
import DealForm from '@/components/admin/DealForm'

interface Props {
  params: { id: string }
}

export default function EditDealPage({ params }: Props) {
  const supabase = createClient()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/restaurant')
      .then(r => r.json())
      .then(async ({ restaurant: rest }) => {
        if (!rest) { setLoading(false); return }
        setRestaurantId(rest.id)
        const { data } = await supabase
          .from('deals')
          .select('*')
          .eq('id', params.id)
          .eq('restaurant_id', rest.id)
          .single()
        setDeal(data ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deals" className="text-gray-400 hover:text-[#8BB06A] transition-colors">
          ← Zurück
        </Link>
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Deal bearbeiten</h1>
      </div>
      {loading && <div className="skeleton h-96 rounded-xl" />}
      {!loading && deal && restaurantId && (
        <DealForm deal={deal} restaurantId={restaurantId} backPath="/dashboard/deals" />
      )}
      {!loading && !deal && (
        <div className="glass rounded-xl p-6 text-center text-gray-500">
          Deal nicht gefunden oder kein Zugriff.
        </div>
      )}
    </div>
  )
}
