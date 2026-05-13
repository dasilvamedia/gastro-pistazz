'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanKey, SubscriptionStatus } from '@/lib/plans'

export interface Subscription {
  id: string
  restaurant_id: string
  plan: PlanKey
  status: SubscriptionStatus
  monthly_fee: number
  setup_fee: number
  setup_paid: boolean
  trial_duration_days: number
  trial_started_at: string | null
  trial_ends_at: string | null
  trial_ended_early: boolean
  trial_converted: boolean
  custom_note: string | null
  created_at: string
  updated_at: string
}

// Pass null to explicitly skip fetching (e.g. super_admin not impersonating).
// Pass undefined or any string to fetch — the server resolves the restaurant from session.
export function useSubscription(restaurantId?: string | null) {
  const [subscription, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(restaurantId !== null)

  const load = useCallback(async () => {
    try {
      // Server-side route uses admin client — bypasses RLS, supports impersonation
      const res = await fetch('/api/dashboard/subscription')
      if (!res.ok) { setLoading(false); return }
      const { subscription: data } = await res.json()
      setSub(data ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (restaurantId === null) { setLoading(false); return }
    load()
  }, [restaurantId, load])

  // Realtime: re-fetch whenever admin updates the subscription row.
  // createClient() is inside the effect so it only runs on the client
  // (avoids window.localStorage access during SSR).
  useEffect(() => {
    if (!subscription?.id) return
    const supabase = createClient()
    // Unique suffix prevents React Strict Mode double-invoke from reusing a
    // still-subscribed channel (Supabase singleton caches by name).
    const channelName = `sub-${subscription.id}-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'subscriptions',
        filter: `id=eq.${subscription.id}`,
      }, () => {
        load()
      })
      .subscribe()
    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [subscription?.id, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  const isTrialActive     = subscription?.status === 'trial' && trialDaysRemaining > 0
  const isTrialExpired    = subscription?.status === 'trial' && trialDaysRemaining <= 0
  const isTrialEndingSoon = isTrialActive && trialDaysRemaining <= 3
  const isPaid            = subscription?.status === 'active'
  const isExpired         = subscription?.status === 'expired' || isTrialExpired

  return {
    subscription,
    loading,
    plan: subscription?.plan ?? 'professional',
    status: subscription?.status ?? 'trial',
    trialDaysRemaining,
    isTrialActive,
    isTrialExpired,
    isTrialEndingSoon,
    isPaid,
    isExpired,
  }
}
