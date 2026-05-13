import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ subscription: null }, { status: 401 })

    const admin = createAdminClient()

    // Resolve restaurant via owner_id (profiles.restaurant_id is not always set)
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    // Also support impersonation cookie
    const cookieStore = await cookies()
    const impId = cookieStore.get('impersonate_restaurant_id')?.value

    const restaurantId = impId ?? restaurant?.id ?? null
    if (!restaurantId) return NextResponse.json({ subscription: null })

    const { data: subscription } = await admin
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single()

    if (!subscription) return NextResponse.json({ subscription: null, restaurant_id: restaurantId })

    const trialEndsAt = subscription.trial_ends_at as string | null
    const trialDaysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
      : 0

    return NextResponse.json({
      subscription: {
        ...subscription,
        trial_days_remaining: trialDaysRemaining,
        is_trial_active: subscription.status === 'trial' && trialDaysRemaining > 0,
        is_trial_expired: subscription.status === 'trial' && trialDaysRemaining <= 0,
      },
      restaurant_id: restaurantId,
    })
  } catch (err) {
    console.error('GET /api/dashboard/subscription error:', err)
    return NextResponse.json({ subscription: null })
  }
}
