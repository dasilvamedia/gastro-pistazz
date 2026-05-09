import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve which restaurant the current session should see.
// Super-admins may impersonate any restaurant via the
// `impersonate_restaurant_id` cookie (set by the admin UI).
// ─────────────────────────────────────────────────────────────────────────────
async function resolveRestaurant(userId: string) {
  const admin = createAdminClient()

  // Check super_admin role
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isSuperAdmin = profile?.role === 'super_admin'

  // Check impersonation cookie (set client-side by admin restaurant list)
  const cookieStore = await cookies()
  const impersonateCookie = cookieStore.get('impersonate_restaurant_id')?.value

  if (isSuperAdmin && impersonateCookie) {
    // Return impersonated restaurant
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('*')
      .eq('id', impersonateCookie)
      .single()
    return { restaurant, isSuperAdmin, impersonatedId: impersonateCookie }
  }

  // Normal restaurant owner: find by owner_id
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .single()

  return { restaurant, isSuperAdmin, impersonatedId: null }
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { restaurant, isSuperAdmin, impersonatedId } = await resolveRestaurant(user.id)

    if (!restaurant) {
      return NextResponse.json({ restaurant: null }, { status: 200 })
    }

    return NextResponse.json({ restaurant, isSuperAdmin, impersonatedId })
  } catch (err) {
    console.error('GET /api/dashboard/restaurant error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH — save restaurant profile (bypasses RLS via admin client) ─────────
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Determine which restaurant we're updating
    const { restaurant, isSuperAdmin, impersonatedId } = await resolveRestaurant(user.id)

    if (!restaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 })
    }

    // Non-super-admins can only update their own restaurant
    if (!isSuperAdmin && !impersonatedId) {
      // Verify ownership
      const { data: owned } = await admin
        .from('restaurants')
        .select('id')
        .eq('id', restaurant.id)
        .eq('owner_id', user.id)
        .single()
      if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Columns that always exist in the DB
    const ALLOWED_CORE = [
      'name', 'type', 'description', 'address', 'zip', 'city',
      'phone', 'email', 'website', 'instagram_handle', 'google_place_id',
      'points_per_story', 'points_per_reel', 'points_per_post',
      'points_per_google_review', 'points_per_receipt',
      'opening_hours',
      'logo_url', 'cover_url', 'primary_color',
      'stamp_card_enabled', 'stamp_card_total', 'stamp_card_reward',
    ]
    // Optional columns — gracefully skipped if migration hasn't been run yet
    const ALLOWED_OPTIONAL = ['google_rating', 'google_review_count', 'opening_hours_note']

    const buildPayload = (includeOptional: boolean) => {
      const keys = includeOptional ? [...ALLOWED_CORE, ...ALLOWED_OPTIONAL] : ALLOWED_CORE
      const p: Record<string, unknown> = {}
      for (const key of keys) { if (key in body) p[key] = body[key] }
      return p
    }

    // Try full payload first; if optional columns are missing, retry without them
    let payload = buildPayload(true)
    let { data, error } = await admin
      .from('restaurants').update(payload).eq('id', restaurant.id).select().single()

    if (error?.message && ALLOWED_OPTIONAL.some(c => error!.message.includes(c))) {
      // Optional columns not yet migrated — retry with core fields only
      payload = buildPayload(false)
      const retry = await admin
        .from('restaurants').update(payload).eq('id', restaurant.id).select().single()
      data  = retry.data
      error = retry.error
    }

    if (error) {
      console.error('PATCH /api/dashboard/restaurant DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ restaurant: data })
  } catch (err) {
    console.error('PATCH /api/dashboard/restaurant error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
