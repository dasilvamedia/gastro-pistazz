import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search      = searchParams.get('search') ?? ''
    const restaurant  = searchParams.get('restaurant') ?? ''  // restaurant_id filter
    const provider    = searchParams.get('provider') ?? ''    // google | apple | email
    const page        = parseInt(searchParams.get('page') ?? '0', 10)
    const pageSize    = 30

    // ── 1. Auth-Users holen (enthält provider info) ──
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })

    // ── 2. Alle visits holen (Herkunfts-Restaurant) ──
    const { data: allVisits } = await admin
      .from('visits')
      .select('user_id, restaurant_id, source, visited_at')

    // visit_map: user_id → [{ restaurant_id, source }]
    const visitMap = new Map<string, { restaurant_id: string; source: string; visited_at: string }[]>()
    for (const v of allVisits ?? []) {
      if (!visitMap.has(v.user_id)) visitMap.set(v.user_id, [])
      visitMap.get(v.user_id)!.push(v)
    }

    // ── 3. Alle Restaurants laden ──
    const { data: restaurants } = await admin.from('restaurants').select('id, name, slug')
    const restMap = new Map((restaurants ?? []).map(r => [r.id, r]))

    // ── 4. Profile laden ──
    const { data: profiles } = await admin.from('profiles').select('id, full_name, email, created_at, total_points, available_points, total_stories, total_visits, role')
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    // ── 5. Zusammenführen — NUR Gäste (keine Restaurant-Owner/Admins) ──
    const guestIds = new Set(
      (profiles ?? []).filter(p => p.role === 'guest').map(p => p.id)
    )

    let combined = authUsers.filter(u => guestIds.has(u.id)).map(u => {
      const p = profileMap.get(u.id)
      const visits = visitMap.get(u.id) ?? []
      // Haupt-Restaurant = erstes onboarding-visit
      const onboardingVisit = visits.find(v => v.source === 'onboarding' || v.source === 'qr_scan')
      const restaurantInfo = onboardingVisit ? restMap.get(onboardingVisit.restaurant_id) : null
      const authProvider = u.app_metadata?.provider ?? u.identities?.[0]?.provider ?? 'email'

      return {
        id: u.id,
        email: u.email ?? p?.email ?? '',
        name: p?.full_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        provider: authProvider,
        created_at: u.created_at,
        restaurant_id: onboardingVisit?.restaurant_id ?? null,
        restaurant_name: restaurantInfo?.name ?? null,
        restaurant_slug: restaurantInfo?.slug ?? null,
        total_points: p?.total_points ?? 0,
        available_points: p?.available_points ?? 0,
        total_stories: p?.total_stories ?? 0,
        total_visits: p?.total_visits ?? 0,
        role: p?.role ?? 'guest',
        all_restaurants: visits.map(v => ({
          restaurant_id: v.restaurant_id,
          name: restMap.get(v.restaurant_id)?.name ?? v.restaurant_id,
          source: v.source,
        })),
      }
    })

    // ── 6. Filter anwenden ──
    if (search) {
      const q = search.toLowerCase()
      combined = combined.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.name ?? '').toLowerCase().includes(q)
      )
    }
    if (restaurant) {
      // match onboarding-restaurant OR any visit to that restaurant
      combined = combined.filter(u =>
        u.restaurant_id === restaurant ||
        u.all_restaurants.some(r => r.restaurant_id === restaurant)
      )
    }
    if (provider) {
      combined = combined.filter(u => u.provider === provider)
    }

    // ── 7. Sortieren (neueste zuerst) ──
    combined.sort((a, b) => b.created_at.localeCompare(a.created_at))

    const total  = combined.length
    const paged  = combined.slice(page * pageSize, (page + 1) * pageSize)

    // ── 8. KPIs ──
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    const kpi = {
      total,
      today: combined.filter(u => u.created_at >= today).length,
      this_week: combined.filter(u => u.created_at >= weekAgo).length,
      google: combined.filter(u => u.provider === 'google').length,
      apple: combined.filter(u => u.provider === 'apple').length,
      email: combined.filter(u => !['google', 'apple'].includes(u.provider)).length,
    }

    return NextResponse.json({ users: paged, total, page, pageSize, kpi, restaurants: restaurants ?? [] })
  } catch (err) {
    console.error('GET /api/admin/all-users error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
