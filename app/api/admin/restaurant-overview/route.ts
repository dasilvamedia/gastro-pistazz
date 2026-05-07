import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await assertSuperAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('id')
    if (!restaurantId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const admin = createAdminClient()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [
      { data: restaurant },
      { count: storiesThisWeek },
      { count: storiesTotal },
      { count: dealsTotal },
      { count: stampCards },
      { data: recentStories },
      { data: pointsData },
    ] = await Promise.all([
      admin.from('restaurants').select('id, name, slug, city, is_active, primary_color, created_at').eq('id', restaurantId).single(),
      admin.from('story_submissions').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('created_at', weekAgo),
      admin.from('story_submissions').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      admin.from('deal_redemptions').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      admin.from('stamp_cards').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      admin.from('story_submissions').select('id, status, created_at, reach, user:profiles(full_name)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(5),
      admin.from('points_transactions').select('points').eq('restaurant_id', restaurantId).gte('created_at', weekAgo),
    ])

    const totalPoints = (pointsData ?? []).reduce((s: number, r: { points: number }) => s + (r.points || 0), 0)
    const pendingStories = (recentStories ?? []).filter((s: { status: string }) => s.status === 'pending').length

    return NextResponse.json({
      restaurant,
      stats: {
        storiesThisWeek: storiesThisWeek ?? 0,
        storiesTotal: storiesTotal ?? 0,
        dealsTotal: dealsTotal ?? 0,
        stampCards: stampCards ?? 0,
        pointsThisWeek: totalPoints,
        pendingStories,
      },
      recentStories: recentStories ?? [],
    })
  } catch (err) {
    console.error('GET /api/admin/restaurant-overview error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
