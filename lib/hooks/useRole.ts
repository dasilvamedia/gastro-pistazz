'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

// Rolle des eingeloggten Nutzers, einmal pro Seitenladung ueber get_my_role
// geholt und modulweit gecacht (BottomNav und Profil fragen beide).
let cached: { userId: string; role: UserRole } | null = null
let pending: Promise<{ userId: string; role: UserRole } | null> | null = null

async function fetchRole() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (cached && cached.userId === user.id) return cached
  const { data } = await supabase.rpc('get_my_role')
  const role = (data as UserRole | null) ?? 'guest'
  cached = { userId: user.id, role }
  return cached
}

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(cached?.role ?? null)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    let alive = true
    pending ??= fetchRole().finally(() => { pending = null })
    pending.then(r => { if (alive) { setRole(r?.role ?? null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  return {
    role,
    loading,
    isOwner: role === 'restaurant_owner',
    isAdmin: role === 'super_admin' || role === 'admin',
  }
}

export function resetRoleCache() { cached = null }
