import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Eigene Stempelkarte des Gastes bei einem Restaurant (?restaurant=<slug>).
// Liefert Restaurant-Stammdaten der Stempelkarte + Karte inkl. reward_code.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('restaurant')
  if (!slug) return NextResponse.json({ error: 'restaurant fehlt' }, { status: 400 })

  const admin = createAdminClient()
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, name, slug, stamp_card_enabled, stamp_card_total, stamp_card_reward, logo_url, primary_color')
    .eq('slug', slug)
    .single()
  if (!restaurant) return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 })

  const { data: card } = await admin
    .from('stamp_cards')
    .select('id, current_stamps, total_stamps_required, is_completed, completed_at, reward_redeemed, reward_code, completed_count')
    .eq('user_id', user.id)
    .eq('restaurant_id', restaurant.id)
    .maybeSingle()

  return NextResponse.json({ restaurant, card: card ?? null })
}
