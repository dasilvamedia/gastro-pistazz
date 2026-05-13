import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function resolveRestaurantId(userId: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isSuperAdmin = profile?.role === 'super_admin'
  const cookieStore = await cookies()
  const impersonateCookie = cookieStore.get('impersonate_restaurant_id')?.value

  if (isSuperAdmin && impersonateCookie) return impersonateCookie

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .single()

  return restaurant?.id ?? null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const restaurantId = await resolveRestaurantId(user.id)
    if (!restaurantId) return NextResponse.json({ error: 'No restaurant found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const search   = searchParams.get('search') ?? ''
    const sortKey  = searchParams.get('sortKey') ?? 'created_at'
    const sortDir  = searchParams.get('sortDir') ?? 'desc'
    const page     = parseInt(searchParams.get('page') ?? '0', 10)
    const pageSize = 20

    const admin = createAdminClient()

    // ── Step 1: get distinct user_ids with REAL activity for this restaurant ──
    // Only show users who have actually done something (story, deal, points).
    // A bare visit/registration does NOT make someone a "Kunde" yet.
    const [{ data: txUsers }, { data: storyUsers }, { data: dealUsers }] = await Promise.all([
      admin.from('points_transactions').select('user_id').eq('restaurant_id', restaurantId),
      admin.from('story_submissions').select('user_id').eq('restaurant_id', restaurantId),
      admin.from('deal_redemptions').select('user_id').eq('restaurant_id', restaurantId),
    ])

    const customerIds = Array.from(new Set([
      ...(txUsers ?? []).map(r => r.user_id),
      ...(storyUsers ?? []).map(r => r.user_id),
      ...(dealUsers ?? []).map(r => r.user_id),
    ]))

    if (customerIds.length === 0) {
      return NextResponse.json({ profiles: [], total: 0 })
    }

    // ── Step 2: fetch profiles filtered to those IDs ──
    // CRITICAL: Exclude restaurant owners / admins — they are never customers of other restaurants
    const GUEST_ONLY_ROLES = ['guest']
    const VALID_SORT_KEYS  = ['total_points', 'total_visits', 'total_stories', 'created_at']
    const safeSortKey = VALID_SORT_KEYS.includes(sortKey) ? sortKey : 'created_at'

    let query = admin
      .from('profiles')
      .select('*', { count: 'exact' })
      .in('id', customerIds)
      .in('role', GUEST_ONLY_ROLES)   // ← Restaurants / Admins ausschließen
      .order(safeSortKey, { ascending: sortDir === 'asc' })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ profiles: data ?? [], total: count ?? 0 })
  } catch (err) {
    console.error('GET /api/dashboard/kunden error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
