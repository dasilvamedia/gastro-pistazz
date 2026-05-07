import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertSuperAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { userId: user.id }
}

export async function GET() {
  try {
    const check = await assertSuperAdmin()
    if (check instanceof NextResponse) return check

    const admin = createAdminClient()

    const [{ data: usersData }, { data: profiles }, { data: restaurants }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from('profiles').select('id, full_name, role').in('role', ['super_admin', 'restaurant_owner']),
      admin.from('restaurants').select('id, name, slug, city, owner_id'),
    ])

    const users = usersData?.users ?? []
    const profileList = profiles ?? []
    const restaurantList = restaurants ?? []

    const restByOwner: Record<string, { id: string; name: string; city: string; slug: string }> = {}
    for (const rest of restaurantList) {
      if (rest.owner_id) restByOwner[rest.owner_id] = { id: rest.id, name: rest.name, city: rest.city, slug: rest.slug }
    }

    const profileMap: Record<string, { full_name: string | null; role: string }> = {}
    for (const p of profileList) profileMap[p.id] = { full_name: p.full_name, role: p.role }

    const profileIds = new Set(profileList.map(p => p.id))

    const result = users
      .filter(u => profileIds.has(u.id))
      .map(u => {
        const profile = profileMap[u.id]
        const rest = restByOwner[u.id]
        return {
          id: u.id,
          email: u.email ?? '',
          full_name: profile?.full_name ?? null,
          role: profile?.role ?? 'guest',
          restaurant_id: rest?.id ?? null,
          restaurant_name: rest?.name ?? null,
          restaurant_city: rest?.city ?? null,
          restaurant_slug: rest?.slug ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          is_banned: !!(u.banned_until && new Date(u.banned_until) > new Date()),
        }
      })

    return NextResponse.json({ accounts: result })
  } catch (err) {
    console.error('GET /api/admin/accounts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await assertSuperAdmin()
    if (check instanceof NextResponse) return check

    const body = await request.json()
    const { email, password, full_name, restaurant_slug, restaurant_name, city } = body

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'email, password, full_name required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    const userId = created.user.id

    await admin.from('profiles').upsert({
      id: userId,
      full_name,
      role: 'restaurant_owner',
      onboarding_completed: true,
    }, { onConflict: 'id' })

    if (restaurant_slug) {
      const { data: existingRest } = await admin
        .from('restaurants')
        .select('id')
        .eq('slug', restaurant_slug)
        .single()

      if (existingRest) {
        await admin.from('restaurants').update({ owner_id: userId }).eq('slug', restaurant_slug)
      } else if (restaurant_name) {
        await admin.from('restaurants').insert({
          name: restaurant_name,
          slug: restaurant_slug,
          type: 'restaurant',
          city: city ?? '',
          owner_id: userId,
          is_active: true,
          primary_color: '#8BB06A',
          points_per_story: 500,
        })
      }
    }

    return NextResponse.json({ ok: true, user_id: userId }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/accounts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const check = await assertSuperAdmin()
    if (check instanceof NextResponse) return check

    const body = await request.json()
    const { user_id, full_name, password, restaurant_slug } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (password) {
      const { error } = await admin.auth.admin.updateUserById(user_id, { password })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (full_name) {
      await admin.from('profiles').update({ full_name }).eq('id', user_id)
    }

    if (restaurant_slug) {
      await admin.from('restaurants').update({ owner_id: user_id }).eq('slug', restaurant_slug)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/admin/accounts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await assertSuperAdmin()
    if (check instanceof NextResponse) return check

    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(user_id, {
      ban_duration: '87600h',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/admin/accounts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
