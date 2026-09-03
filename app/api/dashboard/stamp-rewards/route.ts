import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRestaurant } from '@/lib/dashboard/resolveRestaurant'

// Offene Stempel-Belohnungen des Restaurants: volle Karten, deren
// Belohnung noch nicht bestaetigt wurde.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant } = await resolveRestaurant(user.id, req.nextUrl.searchParams.get('restaurant_id'))
  if (!restaurant) return NextResponse.json({ error: 'Kein Restaurant' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('stamp_cards')
    .select('id, reward_code, total_stamps_required, completed_at, completed_count, user:profiles(full_name)')
    .eq('restaurant_id', restaurant.id)
    .eq('is_completed', true)
    .eq('reward_redeemed', false)
    .order('completed_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('GET /api/dashboard/stamp-rewards error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }

  return NextResponse.json({ rewards: data ?? [], reward_text: restaurant.stamp_card_reward ?? null })
}
