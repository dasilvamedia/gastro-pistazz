import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRestaurant } from '@/lib/dashboard/resolveRestaurant'

// Gesendete Kampagnen des eigenen Restaurants (Owner) bzw. alle (Super-Admin ohne Kundenansicht)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant, isSuperAdmin, role } = await resolveRestaurant(user.id, req.nextUrl.searchParams.get('restaurant_id'))
  if (!role || !['restaurant_owner', 'admin', 'super_admin'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  let q = admin.from('notification_campaigns').select('id, restaurant_id, scope, segment, title, body, recipient_count, push_sent, created_at, restaurant:restaurants(name)')
    .order('created_at', { ascending: false }).limit(50)
  if (restaurant) q = q.eq('restaurant_id', restaurant.id)
  else if (!isSuperAdmin) return NextResponse.json({ error: 'Kein Restaurant' }, { status: 403 })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  return NextResponse.json({ campaigns: data ?? [] })
}
