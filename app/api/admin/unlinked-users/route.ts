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

    // Kuerzlich registrierte Nutzer der letzten 60 Tage direkt aus profiles
    // (skaliert; listUsers haette nur die erste 1000er-Seite gesehen).
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentProfiles } = await admin
      .from('profiles')
      .select('id, full_name, email, created_at, auth_provider')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)

    if (!recentProfiles?.length) return NextResponse.json({ users: [], restaurantId })

    // Bereits mit diesem Restaurant verknuepfte Nutzer
    const { data: existingVisits } = await admin
      .from('visits')
      .select('user_id')
      .eq('restaurant_id', restaurantId)
    const linkedIds = new Set((existingVisits ?? []).map(v => v.user_id))

    const unlinked = recentProfiles
      .filter(p => !linkedIds.has(p.id))
      .map(p => ({
        id: p.id,
        email: p.email ?? '',
        name: p.full_name ?? null,
        provider: p.auth_provider ?? 'email',
        created_at: p.created_at,
      }))

    return NextResponse.json({ users: unlinked, restaurantId })
  } catch (err) {
    console.error('GET /api/admin/unlinked-users error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
