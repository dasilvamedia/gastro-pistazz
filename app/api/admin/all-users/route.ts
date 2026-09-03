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

    // Herkunfts-Restaurant nur fuer die Seite bestimmen (erster Besuch)
    const ids = (profiles ?? []).map(p => p.id)
    const firstVisit = new Map<string, { restaurant_id: string; source: string; visited_at: string }>()
    if (ids.length) {
      const { data: visits } = await admin
        .from('visits')
        .select('user_id, restaurant_id, source, visited_at')
        .in('user_id', ids)
        .order('visited_at', { ascending: true })
      for (const v of visits ?? []) if (!firstVisit.has(v.user_id)) firstVisit.set(v.user_id, v)
    }
    const restIds = [...new Set([...firstVisit.values()].map(v => v.restaurant_id))]
    const restMap = new Map<string, { id: string; name: string; slug: string }>()
    if (restIds.length) {
      const { data: rests } = await admin.from('restaurants').select('id, name, slug').in('id', restIds)
      for (const r of rests ?? []) restMap.set(r.id, r)
    }

    const users = (profiles ?? []).map(p => {
      const v = firstVisit.get(p.id)
      const r = v ? restMap.get(v.restaurant_id) : null
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name ?? ([p.first_name, p.last_name].filter(Boolean).join(' ') || null),
        created_at: p.created_at,
        last_sign_in_at: null,
        provider: p.auth_provider ?? 'unbekannt',
        role: p.role,
        total_points: p.total_points,
        available_points: p.available_points,
        total_stories: p.total_stories,
        total_visits: p.total_visits,
        restaurant: r ? { id: r.id, name: r.name, slug: r.slug } : null,
        visit_source: v?.source ?? null,
        visit_count: p.total_visits ?? 0,
      }
    })

    return NextResponse.json({ users, total: count ?? users.length, page, pageSize })
  } catch (err) {
    console.error('GET /api/admin/all-users error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
