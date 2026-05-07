import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const createDealSchema = z.object({
  restaurant_id: z.string().uuid('Invalid restaurant_id'),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  trigger: z.enum([
    'instagram_story',
    'instagram_reel',
    'instagram_post',
    'google_review',
    'receipt_upload',
    'stamp_card',
    'custom',
  ]),
  status: z.enum(['active', 'paused', 'expired', 'draft']).default('draft'),
  reward_type: z.enum(['discount_percent', 'discount_fixed', 'free_item', 'bogo', 'custom']),
  reward_value: z.string().max(100).optional(),
  points_required: z.number().int().min(0).default(0),
  min_order_value: z.number().min(0).optional(),
  max_redemptions: z.number().int().min(1).optional(),
  max_per_user: z.number().int().min(1).default(1),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  valid_days: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  valid_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  valid_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  image_url: z.string().url().optional(),
  badge_text: z.string().max(30).optional(),
  badge_color: z.string().default('#000000'),
  sort_order: z.number().int().min(0).default(0),
})

const updateDealSchema = createDealSchema.partial().extend({
  id: z.string().uuid('Invalid deal id'),
})

async function getOwnerRestaurantIds(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
  return (data ?? []).map((r: { id: string }) => r.id)
}

async function assertOwnerOfRestaurant(
  userId: string,
  restaurantId: string,
  role: string
): Promise<boolean> {
  if (role === 'admin') return true
  const ids = await getOwnerRestaurantIds(userId)
  return ids.includes(restaurantId)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    const admin = createAdminClient()
    let query = admin
      .from('deals')
      .select('*, restaurant:restaurants(id, name, slug, logo_url, primary_color)')
      .order('sort_order', { ascending: true })

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId)
    }

    const { data, error } = await query

    if (error) {
      console.error('GET /api/deals error:', error)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    return NextResponse.json({ deals: data ?? [] })
  } catch (err) {
    console.error('GET /api/deals error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createDealSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'restaurant_owner' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowed = await assertOwnerOfRestaurant(user.id, parsed.data.restaurant_id, profile.role)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: not your restaurant' }, { status: 403 })
    }

    const { data: deal, error: insertError } = await admin
      .from('deals')
      .insert(parsed.data)
      .select()
      .single()

    if (insertError) {
      console.error('POST /api/deals insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    return NextResponse.json({ deal }, { status: 201 })
  } catch (err) {
    console.error('POST /api/deals error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateDealSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...updates } = parsed.data

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'restaurant_owner' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the deal belongs to the owner's restaurant
    const { data: existing } = await admin
      .from('deals')
      .select('restaurant_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const allowed = await assertOwnerOfRestaurant(user.id, existing.restaurant_id, profile.role)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: not your deal' }, { status: 403 })
    }

    const { data: deal, error: updateError } = await admin
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('PATCH /api/deals update error:', updateError)
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
    }

    return NextResponse.json({ deal })
  } catch (err) {
    console.error('PATCH /api/deals error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing deal id' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'restaurant_owner' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: existing } = await admin
      .from('deals')
      .select('restaurant_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const allowed = await assertOwnerOfRestaurant(user.id, existing.restaurant_id, profile.role)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: not your deal' }, { status: 403 })
    }

    const { error: deleteError } = await admin.from('deals').delete().eq('id', id)

    if (deleteError) {
      console.error('DELETE /api/deals error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/deals error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
