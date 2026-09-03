import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// "Meine Deals" des Gastes. Vorher werden abgelaufene Codes des Nutzers
// geschlossen und erstattet (lazy expire), damit die Liste und der
// Kontostand immer stimmen, auch ohne Cron.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error: expireError } = await admin.rpc('expire_deal_redemptions', { p_user_id: user.id })
  if (expireError) console.error('expire_deal_redemptions error:', expireError)

  const { data, error } = await admin
    .from('deal_redemptions')
    .select('id, deal_id, status, points_spent, redeemed_at, used_at, expires_at, redemption_code, refunded_at, deal:deals(title, image_url), restaurant:restaurants(name, slug)')
    .eq('user_id', user.id)
    .order('redeemed_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('GET /api/deals/redemptions error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }

  return NextResponse.json({ redemptions: data ?? [] })
}
