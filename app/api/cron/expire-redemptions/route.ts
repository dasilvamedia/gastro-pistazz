import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Stuendlich per Server-Crontab aufrufen (vercel.json-Crons laufen auf pm2 nie):
//   0 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//     https://gastro.pistazz.io/api/cron/expire-redemptions
// Schliesst abgelaufene Deal-Codes aller Nutzer und erstattet die Punkte.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('expire_deal_redemptions')
  if (error) {
    console.error('cron expire-redemptions error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expired: data ?? 0, at: new Date().toISOString() })
}
