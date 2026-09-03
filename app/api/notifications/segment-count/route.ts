import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRestaurant } from '@/lib/dashboard/resolveRestaurant'
import { filterSegment, SEGMENT_KEYS } from '@/lib/notifications/segments'

// Vorschau: wie viele Kunden treffen auf ein Segment, plus die Kundenliste
// fuer den Einzelversand (nur eigene Kunden, nie alle Profile).
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant, role } = await resolveRestaurant(user.id, req.nextUrl.searchParams.get('restaurant_id'))
  if (!role || !['restaurant_owner', 'admin', 'super_admin'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!restaurant) return NextResponse.json({ error: 'Kein Restaurant' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('restaurant_customers', { p_restaurant_id: restaurant.id })
  if (error) return NextResponse.json({ error: 'Kunden konnten nicht geladen werden' }, { status: 500 })
  const customers = (data ?? []) as Array<{ user_id: string; full_name: string | null; first_name: string | null; tier: string | null; last_activity_at: string | null; current_stamps: number | null; stamps_total: number | null }>

  const counts: Record<string, number> = {}
  for (const seg of SEGMENT_KEYS) {
    counts[seg] = filterSegment(customers, seg).length
  }

  return NextResponse.json({
    counts,
    customers: customers.map(c => ({ id: c.user_id, name: c.full_name ?? c.first_name ?? 'Gast', tier: c.tier, last_activity_at: c.last_activity_at })),
  })
}
