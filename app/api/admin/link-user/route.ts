import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const restaurantId = await resolveRestaurantId(user.id)
    if (!restaurantId) return NextResponse.json({ error: 'Kein Restaurant gefunden' }, { status: 404 })

    const { email } = await request.json() as { email: string }
    if (!email) return NextResponse.json({ error: 'E-Mail fehlt' }, { status: 400 })

    const admin = createAdminClient()

    // Profil anhand der E-Mail suchen
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (!profile) {
      // Auch in auth.users suchen (falls E-Mail nur dort gespeichert ist).
      // Paginieren, sonst wird bei > 1000 Nutzern jenseits der ersten Seite
      // nichts gefunden.
      const needle = email.trim().toLowerCase()
      let authUser: { id: string; email?: string; user_metadata?: { full_name?: string; name?: string } } | null = null
      for (let page = 1; page <= 60 && !authUser; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        const list = data?.users ?? []
        authUser = list.find(u => u.email?.toLowerCase() === needle) ?? null
        if (list.length < 1000) break
      }
      if (!authUser) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })

      // Profil ggf. anlegen
      await admin.from('profiles').upsert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        role: 'guest',
        onboarding_completed: true,
      }, { onConflict: 'id', ignoreDuplicates: true })

      // Visit eintragen
      await admin.from('visits').upsert(
        { user_id: authUser.id, restaurant_id: restaurantId, source: 'manual', visited_at: new Date().toISOString() },
        { onConflict: 'user_id,restaurant_id', ignoreDuplicates: false },
      )
      return NextResponse.json({ ok: true, name: authUser.user_metadata?.full_name ?? authUser.email })
    }

    // Visit eintragen
    await admin.from('visits').upsert(
      { user_id: profile.id, restaurant_id: restaurantId, source: 'manual', visited_at: new Date().toISOString() },
      { onConflict: 'user_id,restaurant_id', ignoreDuplicates: false },
    )
    return NextResponse.json({ ok: true, name: profile.full_name ?? profile.email })
  } catch (err) {
    console.error('POST /api/admin/link-user error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
