import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapRedeemError } from '@/lib/deals/redeemErrors'
import { notifyRestaurantOwner } from '@/lib/notifyUser'

const redeemSchema = z.object({
  deal_id: z.string().uuid('Invalid deal_id'),
})

// Duenner Auth-Wrapper: die gesamte Logik (Gueltigkeit, Limits, Guthaben,
// Code, Punkteabzug, Zaehler) laeuft atomar in der RPC redeem_deal (025).
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

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('redeem_deal', {
      p_user_id: user.id,
      p_deal_id: parsed.data.deal_id,
    })

    if (error) {
      const mapped = mapRedeemError(error.message)
      if (mapped.status === 500) console.error('redeem_deal rpc error:', error)
      return NextResponse.json({ error: mapped.message, code: error.message }, { status: mapped.status })
    }

    const result = data as {
      redemption_id: string
      redemption_code: string
      expires_at: string
      points_spent: number
      available_points: number
    }

    // Inhaber informieren (Gast sieht den Code bereits auf dem Screen)
    const { data: deal } = await admin.from('deals').select('title, restaurant_id').eq('id', parsed.data.deal_id).maybeSingle()
    if (deal) {
      notifyRestaurantOwner(deal.restaurant_id, {
        title: `Deal angefordert: ${deal.title}`,
        body: `Code ${result.redemption_code}. Bestaetigen unter Einloesen, sobald der Gast ihn zeigt.`,
        url: '/dashboard/einloesen',
      }).catch(() => {})
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('POST /api/deals/redeem error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
