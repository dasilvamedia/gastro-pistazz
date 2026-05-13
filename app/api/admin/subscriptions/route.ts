import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'super_admin') return null
  return { userId: user.id, admin }
}

export async function GET() {
  try {
    const auth = await assertSuperAdmin()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data } = await auth.admin
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    // Compute derived fields in JS since view may not exist yet
    const enriched = (data ?? []).map((s: Record<string, unknown>) => {
      const trialEndsAt = s.trial_ends_at as string | null
      const daysRemaining = trialEndsAt
        ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
        : 0
      return {
        ...s,
        trial_days_remaining: daysRemaining,
        is_trial_active: s.status === 'trial' && daysRemaining > 0,
        is_trial_expired: s.status === 'trial' && daysRemaining <= 0,
      }
    })

    return NextResponse.json({ subscriptions: enriched })
  } catch (err) {
    console.error('GET /api/admin/subscriptions error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
