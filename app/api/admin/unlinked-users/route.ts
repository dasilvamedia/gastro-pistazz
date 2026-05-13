import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function resolveRestaurantId(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single()
  const isSuperAdmin = profile?.role === 'super_admin'
  const cookieStore = await cookies()
  const impersonate = cookieStore.get('impersonate_restaurant_id')?.value
  if (isSuperAdmin && impersonate) return impersonate
  const { data: rest } = await admin.from('restaurants').select('id').eq('owner_id', userId).single()
  return rest?.id ?? null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const restaurantId = await resolveRestaurantId(user.id)
    if (!restaurantId) return NextResponse.json({ error: 'Kein Restaurant gefunden' }, { status: 404 })

    const admin = createAdminClient()

    // Alle Auth-User der letzten 60 Tage
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })

    // Nur kürzlich registrierte filtern
    const recentUsers = authUsers.filter(u => u.created_at > since)

    if (!recentUsers.length) return NextResponse.json({ users: [] })

    // Alle visits für dieses Restaurant laden
    const { data: existingVisits } = await admin
      .from('visits')
      .select('user_id')
      .eq('restaurant_id', restaurantId)

    const linkedIds = new Set((existingVisits ?? []).map(v => v.user_id))

    // Profile für diese User laden
    const recentIds = recentUsers.map(u => u.id)
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, email, created_at')
      .in('id', recentIds)

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    // Nicht verknüpfte User — mit Provider-Info
    const unlinked = recentUsers
      .filter(u => !linkedIds.has(u.id))
      .map(u => {
        const profile = profileMap.get(u.id)
        const provider = u.app_metadata?.provider ?? u.identities?.[0]?.provider ?? 'email'
        return {
          id: u.id,
          email: u.email ?? profile?.email ?? '',
          name: profile?.full_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
          provider,
          created_at: u.created_at,
        }
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    return NextResponse.json({ users: unlinked, restaurantId })
  } catch (err) {
    console.error('GET /api/admin/unlinked-users error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
