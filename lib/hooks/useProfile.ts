'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/useAuthStore'
import type { Profile } from '@/types'

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const { user, setUser, setLoading } = useAuthStore()
  const [loading, setLocalLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLocalLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoading(false)
        setLocalLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        setUser(null)
      } else {
        setUser(profile as Profile)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile'
      setError(message)
    } finally {
      setLocalLoading(false)
      setLoading(false)
    }
  }, [setUser, setLoading])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile: user,
    loading,
    error,
    refetch: fetchProfile,
  }
}
