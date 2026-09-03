import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRestaurant } from '@/lib/dashboard/resolveRestaurant'
import { mapRedeemError } from '@/lib/deals/redeemErrors'
import { notifyUser } from '@/lib/notifyUser'

// Restaurant-Seite der Einloesung. Ein Code ist entweder ein Deal-Code
// (deal_redemptions.redemption_code) oder ein Stempel-Belohnungscode
// (stamp_cards.reward_code). Beide werden hier geprueft (GET) und
// bestaetigt (POST). Rolle: restaurant_owner, admin, super_admin.

const STAFF_ROLES = ['restaurant_owner', 'admin', 'super_admin']

type Preview = {
  kind: 'deal' | 'stamp'
  code: string
  title: string
  guest_name: string | null
  restaurant_id: string
  restaurant_name: string | null
  status: string
  expires_at: string | null
  points_spent: number
  reward: string | null
}

async function lookupCode(code: string): Promise<Preview | null> {
  const admin = createAdminClient()
  const clean = code.trim().toUpperCase()

  const { data: deal } = await admin
    .from('deal_redemptions')
    .select('id, status, expires_at, points_spent, restaurant_id, deal:deals(title), user:profiles(full_name), restaurant:restaurants(name)')
    .eq('redemption_code', clean)
    .maybeSingle()

  if (deal) {
    const d = deal as unknown as {
      status: string; expires_at: string | null; points_spent: number; restaurant_id: string
      deal: { title: string } | null; user: { full_name: string | null } | null; restaurant: { name: string } | null
    }
    const expired = d.status === 'pending' && d.expires_at && new Date(d.expires_at) < new Date()
    return {
      kind: 'deal',
      code: clean,
      title: d.deal?.title ?? 'Deal',
      guest_name: d.user?.full_name ?? null,
      restaurant_id: d.restaurant_id,
      restaurant_name: d.restaurant?.name ?? null,
      status: expired ? 'expired' : d.status,
      expires_at: d.expires_at,
      points_spent: d.points_spent,
      reward: null,
    }
  }

  const { data: card } = await admin
    .from('stamp_cards')
    .select('id, is_completed, reward_redeemed, restaurant_id, user:profiles(full_name), restaurant:restaurants(name, stamp_card_reward)')
    .eq('reward_code', clean)
    .maybeSingle()

  if (card) {
    const c = card as unknown as {
      is_completed: boolean; reward_redeemed: boolean; restaurant_id: string
      user: { full_name: string | null } | null; restaurant: { name: string; stamp_card_reward: string | null } | null
    }
    return {
      kind: 'stamp',
      code: clean,
      title: 'Stempelkarte voll',
      guest_name: c.user?.full_name ?? null,
      restaurant_id: c.restaurant_id,
      restaurant_name: c.restaurant?.name ?? null,
      status: c.is_completed && !c.reward_redeemed ? 'pending' : 'used',
      expires_at: null,
      points_spent: 0,
      reward: c.restaurant?.stamp_card_reward ?? null,
    }
  }

  return null
}

// Liefert die restaurant_id, fuer die der Aufrufer bestaetigen darf, oder null.
async function authorize(rowRestaurantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, allowed: null as string | null, forbidden: false }

  const { restaurant, isSuperAdmin, role } = await resolveRestaurant(user.id)
  if (!role || !STAFF_ROLES.includes(role)) return { user, allowed: null, forbidden: true }

  // Super-Admin ohne Kundenansicht darf jeden Code bestaetigen
  const allowed = restaurant?.id ?? (isSuperAdmin ? rowRestaurantId : null)
  return { user, allowed, forbidden: false }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? ''
  if (code.trim().length < 6) return NextResponse.json({ error: 'Code fehlt' }, { status: 400 })

  const preview = await lookupCode(code)
  if (!preview) {
    const m = mapRedeemError('code_not_found')
    return NextResponse.json({ error: m.message, code: 'code_not_found' }, { status: m.status })
  }

  const { user, allowed, forbidden } = await authorize(preview.restaurant_id)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (forbidden) return NextResponse.json({ error: 'Diese Seite ist fuer Restaurants.', code: 'not_staff' }, { status: 403 })
  if (allowed !== preview.restaurant_id) {
    const m = mapRedeemError('wrong_restaurant')
    return NextResponse.json({ error: m.message, code: 'wrong_restaurant' }, { status: m.status })
  }

  return NextResponse.json({ preview })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const code = String(body.code ?? '').trim().toUpperCase()
  if (code.length < 6) return NextResponse.json({ error: 'Code fehlt' }, { status: 400 })

  const preview = await lookupCode(code)
  if (!preview) {
    const m = mapRedeemError('code_not_found')
    return NextResponse.json({ error: m.message, code: 'code_not_found' }, { status: m.status })
  }

  const { user, allowed, forbidden } = await authorize(preview.restaurant_id)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (forbidden) return NextResponse.json({ error: 'Diese Seite ist fuer Restaurants.', code: 'not_staff' }, { status: 403 })
  if (!allowed) return NextResponse.json({ error: 'Kein Restaurant zugeordnet.' }, { status: 403 })

  const admin = createAdminClient()
  const fn = preview.kind === 'deal' ? 'confirm_deal_redemption' : 'confirm_stamp_reward'
  const { data, error } = await admin.rpc(fn, {
    p_code: code,
    p_restaurant_id: allowed,
    p_actor: user.id,
  })

  if (error) {
    const mapped = mapRedeemError(error.message)
    if (mapped.status === 500) console.error(`${fn} rpc error:`, error)
    return NextResponse.json({ error: mapped.message, code: error.message }, { status: mapped.status })
  }

  // Gast informieren: Bestaetigung ist durch (der Live-Screen springt sowieso um)
  const r = data as { user_id?: string; title?: string; reward?: string | null } | null
  if (r?.user_id) {
    notifyUser(r.user_id, preview.kind === 'deal'
      ? { title: 'Deal eingeloest', body: `${r.title ?? preview.title} bei ${preview.restaurant_name ?? 'deinem Restaurant'}. Viel Spass!`, url: '/deals', restaurant_id: preview.restaurant_id, push: false }
      : { title: 'Belohnung eingeloest', body: `${r.reward ?? preview.reward ?? 'Deine Belohnung'} bei ${preview.restaurant_name ?? 'deinem Restaurant'}. Deine neue Stempelkarte hat begonnen.`, url: '/profil', restaurant_id: preview.restaurant_id, push: false },
    ).catch(() => {})
  }

  return NextResponse.json({ ok: true, result: data, preview })
}
