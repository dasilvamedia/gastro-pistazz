'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/useAuthStore'
import type { Restaurant } from '@/types'

interface UseRestaurantReturn {
  restaurant: Restaurant | null
  loading: boolean
  error: string | null
}

export function useRestaurant(): UseRestaurantReturn {
  const { user } = useAuthStore()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    if (user.role !== 'restaurant_owner' && user.role !== 'admin') {
      setLoading(false)
      return
    }

    async function fetchRestaurant() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user!.id)
          .single()

        if (fetchError) {
          setError(fetchError.message)
          setRestaurant(null)
        } else {
          setRestaurant(data as Restaurant)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch restaurant'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurant()
  }, [user])

  return { restaurant, loading, error }
}
