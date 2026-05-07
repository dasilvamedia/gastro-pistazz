import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const redeemSchema = z.object({
  deal_id: z.string().uuid('Invalid deal_id'),
})

function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = redeemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { deal_id } = parsed.data
    const admin = createAdminClient()

    // Verify user is a guest
    const { data: profile } = await admin
      .from('profiles')
      .select('role, available_points')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'guest') {
      return NextResponse.json(
        { error: 'Only guests can redeem deals' },
        { status: 403 }
      )
    }

    // 1. Fetch deal
    const { data: deal, error: dealError } = await admin
      .from('deals')
      .select('*')
      .eq('id', deal_id)
      .eq('status', 'active')
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found or not active' }, { status: 404 })
    }

    const now = new Date()

    // Check validity dates
    if (deal.valid_from && new Date(deal.valid_from) > now) {
      return NextResponse.json({ error: 'Deal not yet available' }, { status: 400 })
    }
    if (deal.valid_until && new Date(deal.valid_until) < now) {
      return NextResponse.json({ error: 'Deal has expired' }, { status: 400 })
    }

    // Check valid days (0=Sunday, 6=Saturday)
    if (deal.valid_days && deal.valid_days.length > 0) {
      const currentDay = now.getDay()
      if (!deal.valid_days.includes(currentDay)) {
        return NextResponse.json({ error: 'Deal not available today' }, { status: 400 })
      }
    }

    // 2. Check points
    if (deal.points_required > 0 && profile.available_points < deal.points_required) {
      return NextResponse.json(
        { error: 'Insufficient points', required: deal.points_required, available: profile.available_points },
        { status: 400 }
      )
    }

    // 3. Check max_per_user
    const { count: userRedemptionCount } = await admin
      .from('deal_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('deal_id', deal_id)
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled')

    if ((userRedemptionCount ?? 0) >= deal.max_per_user) {
      return NextResponse.json(
        { error: 'Redemption limit reached for this deal' },
        { status: 400 }
      )
    }

    // 4. Check max_redemptions
    if (deal.max_redemptions !== null) {
      const { count: totalRedemptions } = await admin
        .from('deal_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('deal_id', deal_id)
        .not('status', 'eq', 'cancelled')

      if ((totalRedemptions ?? 0) >= deal.max_redemptions) {
        return NextResponse.json({ error: 'Deal fully redeemed' }, { status: 400 })
      }
    }

    // 5. Create redemption record
    const redemptionCode = generateRedemptionCode()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // 24h

    const { data: redemption, error: redemptionError } = await admin
      .from('deal_redemptions')
      .insert({
        deal_id,
        user_id: user.id,
        restaurant_id: deal.restaurant_id,
        status: 'pending',
        points_spent: deal.points_required,
        redeemed_at: now.toISOString(),
        expires_at: expiresAt,
        redemption_code: redemptionCode,
      })
      .select('id, redemption_code, expires_at')
      .single()

    if (redemptionError) {
      console.error('Deal redemption insert error:', redemptionError)
      return NextResponse.json({ error: 'Failed to create redemption' }, { status: 500 })
    }

    // 6. Deduct points if required
    if (deal.points_required > 0) {
      const newAvailable = profile.available_points - deal.points_required

      const { error: pointsUpdateError } = await admin
        .from('profiles')
        .update({ available_points: newAvailable })
        .eq('id', user.id)

      if (pointsUpdateError) {
        console.error('Points deduction error:', pointsUpdateError)
        // Rollback redemption
        await admin.from('deal_redemptions').delete().eq('id', redemption.id)
        return NextResponse.json({ error: 'Failed to deduct points' }, { status: 500 })
      }

      // Create points transaction
      await admin.from('points_transactions').insert({
        user_id: user.id,
        restaurant_id: deal.restaurant_id,
        type: 'spent',
        amount: -deal.points_required,
        balance_after: newAvailable,
        reference_type: 'deal_redemption',
        reference_id: redemption.id,
        description: `Eingelöst: ${deal.title}`,
      })
    }

    return NextResponse.json({
      redemption_code: redemption.redemption_code,
      expires_at: redemption.expires_at,
      redemption_id: redemption.id,
    })
  } catch (err) {
    console.error('POST /api/deals/redeem error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
