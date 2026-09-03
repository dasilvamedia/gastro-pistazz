import { NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/lib/adminAuth'

// Nur Booleans: ist ein Dienst konfiguriert? Werte verlassen den Server nie.
export async function GET() {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const has = (...keys: string[]) => keys.every(k => !!process.env[k])
  return NextResponse.json({
    status: {
      supabase: has('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      service_role: has('SUPABASE_SERVICE_ROLE_KEY'),
      apns: has('APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_KEY_P8'),
      web_push: has('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'),
      anthropic: has('ANTHROPIC_API_KEY'),
      google_places: !!(process.env.GOOGLE_PLACES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
      smtp: has('SMTP_PASS'),
      cron: has('CRON_SECRET'),
      internal_secret: has('INTERNAL_NOTIFY_SECRET'),
    },
  })
}
