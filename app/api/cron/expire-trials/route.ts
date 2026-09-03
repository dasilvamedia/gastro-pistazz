import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyRestaurantOwner } from '@/lib/notifyUser'

// Taeglich per Crontab: abgelaufene Testphasen auf 'expired' setzen und den
// Inhaber informieren. Der ExpiredGate im Dashboard greift dann.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: due, error } = await admin
    .from('subscriptions')
    .select('id, restaurant_id')
    .eq('status', 'trial')
    .lt('trial_ends_at', new Date().toISOString())
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let expired = 0
  for (const s of due ?? []) {
    const { error: upErr } = await admin.from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', s.id)
    if (upErr) continue
    expired++
    await notifyRestaurantOwner(s.restaurant_id, {
      title: 'Deine Testphase ist abgelaufen',
      body: 'Danke fuers Testen. Waehle jetzt dein Paket, damit deine Gaeste weiter Punkte sammeln koennen.',
      url: '/dashboard/einstellungen?tab=plan',
    }).catch(() => {})
  }

  return NextResponse.json({ expired, at: new Date().toISOString() })
}
