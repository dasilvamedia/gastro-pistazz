import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Push abschalten: Geraete-Token (nativ) oder Web-Subscription des Nutzers loeschen
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { token?: string; endpoint?: string; all?: boolean }
  const admin = createAdminClient()
  if (body.all) {
    await admin.from('device_tokens').delete().eq('user_id', user.id)
    await admin.from('push_subscriptions').delete().eq('user_id', user.id)
  } else {
    if (body.token) await admin.from('device_tokens').delete().eq('user_id', user.id).eq('token', body.token)
    if (body.endpoint) await admin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', body.endpoint)
  }
  return NextResponse.json({ ok: true })
}
