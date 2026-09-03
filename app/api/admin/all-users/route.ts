import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/lib/adminAuth'

// Nutzerliste fuer den Super-Admin. Vorher wurden pro Request ALLE Auth-User
// (Kappung bei 1000), alle visits und alle profiles in den Speicher geladen.
// Jetzt: eine paginierte profiles-Abfrage, Provider aus profiles.auth_provider
// (Trigger 030, Backfill /api/admin/backfill-auth-provider), Restaurant nur
// fuer die aktuelle Seite.

export async function GET(request: NextRequest) {
  try {
    const auth = await assertSuperAdmin()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { admin } = auth

    const { searchParams } = new URL(request.url)
    const search     = (searchParams.get('search') ?? '').trim()
    const restaurant = searchParams.get('restaurant') ?? ''
    const provider   = searchParams.get('provider') ?? ''
    const page       = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0)
    const pageSize   = 30

    // Restaurant-Filter: Nutzer mit Besuch in diesem Restaurant
    let userIdsForRestaurant: string[] | null = null
    if (restaurant) {
      const { data } = await admin.from('visits').select('user_id').eq('restaurant_id', restaurant).limit(5000)
      userIdsForRestaurant = [...new Set((data ?? []).map(v => v.user_id as string))]
      if (userIdsForRestaurant.length === 0) return NextResponse.json({ users: [], total: 0, page, pageSize })
    }

    let q = admin
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, created_at, total_points, available_points, total_stories, total_visits, role, auth_provider, restaurant_id', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)

    if (search) {
      const term = search.replace(/[,()%]/g, ' ').trim()
      q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,first_name.ilike.%${term}%`)
    }
    if (provider) q = q.eq('auth_provider', provider)
    if (userIdsForRestaurant) q = q.in('id', userIdsForRestaurant.slice(0, 1000))

    const { data: profiles, count, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Alle besuchten Restaurants pro Nutzer der Seite (fuer die Chips/Filter)
    const ids = (profiles ?? []).map(p => p.id)
    const perUser = new Map<string, Map<string, string>>() // userId -> (restId -> source)
    if (ids.length) {
      const { data: visits } = await admin
        .from('visits')
        .select('user_id, restaurant_id, source')
        .in('user_id', ids)
      for (const v of visits ?? []) {
        if (!v.restaurant_id) continue
        if (!perUser.has(v.user_id)) perUser.set(v.user_id, new Map())
        const m = perUser.get(v.user_id)!
        if (!m.has(v.restaurant_id)) m.set(v.restaurant_id, v.source)
      }
    }
    const restIds = [...new Set([...perUser.values()].flatMap(m => [...m.keys()]))]
    const restNameMap = new Map<string, string>()
    if (restIds.length) {
      const { data: rests } = await admin.from('restaurants').select('id, name').in('id', restIds)
      for (const r of rests ?? []) restNameMap.set(r.id, r.name)
    }

    const users = (profiles ?? []).map(p => {
      const rmap = perUser.get(p.id)
      const all_restaurants = rmap
        ? [...rmap.entries()].map(([rid, source]) => ({ restaurant_id: rid, name: restNameMap.get(rid) ?? '—', source }))
        : []
      const first = all_restaurants[0] ?? null
      return {
        id: p.id,
        email: p.email,
        name: p.full_name ?? ([p.first_name, p.last_name].filter(Boolean).join(' ') || null),
        provider: p.auth_provider ?? 'email',
        created_at: p.created_at,
        restaurant_id: first?.restaurant_id ?? null,
        restaurant_name: first?.name ?? null,
        restaurant_slug: null,
        total_points: p.total_points ?? 0,
        available_points: p.available_points ?? 0,
        total_stories: p.total_stories ?? 0,
        total_visits: p.total_visits ?? 0,
        role: p.role,
        all_restaurants,
      }
    })

    // Restaurant-Liste fuer den Filter (alle, nach Name)
    const { data: allRests } = await admin.from('restaurants').select('id, name, slug').order('name')

    // KPI global (leichte count-Abfragen)
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
    const weekAgo = new Date(Date.now() - 7 * 86400000)
    const [kTotal, kToday, kWeek, kGoogle, kApple, kEmail] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', startToday.toISOString()),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('auth_provider', 'google'),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('auth_provider', 'apple'),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('auth_provider', 'email'),
    ])
    const kpi = {
      total: kTotal.count ?? 0, today: kToday.count ?? 0, this_week: kWeek.count ?? 0,
      google: kGoogle.count ?? 0, apple: kApple.count ?? 0, email: kEmail.count ?? 0,
    }

    return NextResponse.json({ users, total: count ?? users.length, page, pageSize, restaurants: allRests ?? [], kpi })
  } catch (err) {
    console.error('GET /api/admin/all-users error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
