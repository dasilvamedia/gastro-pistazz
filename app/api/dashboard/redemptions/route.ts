import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRestaurant } from '@/lib/dashboard/resolveRestaurant'

// Einloesungen des eigenen Restaurants fuer die Seite "Einloesen"
// (?range=today|week, Standard today).
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant } = await resolveRestaurant(user.id, req.nextUrl.searchParams.get('restaurant_id'))
  if (!restaurant) return NextResponse.json({ error: 'Kein Restaurant' }, { status: 403 })

  const range = req.nextUrl.searchParams.get('range') === 'week' ? 7 : 1
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (range - 1))

  const admin = createAdminClient()
  const { error: expireError } = await admin.rpc('expire_deal_redemptions')
  if (expireError) console.error('expire_deal_redemptions error:', expireError)

  const [{ data: redemptions }, { data: claims }] = await Promise.all([
    admin
      .from('deal_redemptions')
      .select('id, status, points_spent, redeemed_at, used_at, expires_at, redemption_code, deal:deals(title), user:profiles(full_name)')
      .eq('restaurant_id', restaurant.id)
      .gte('redeemed_at', since.toISOString())
      .order('redeemed_at', { ascending: false })
      .limit(100),
    admin
      .from('stamp_reward_claims')
      .select('id, reward_text, reward_code, stamps_required, confirmed_at, user:profiles(full_name)')
      .eq('restaurant_id', restaurant.id)
      .gte('confirmed_at', since.toISOString())
      .order('confirmed_at', { ascending: false })
      .limit(100),
  ])

  return NextResponse.json({ redemptions: redemptions ?? [], stamp_claims: claims ?? [] })
}
