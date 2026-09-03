import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { broadcastLive, type LiveEvent } from '@/lib/liveBroadcast'

// Inhaber/Admin loest nach einer clientseitigen Aenderung (z.B. Deal
// pausieren) das Live-Event fuer alle Gaeste aus. Nur eingeloggte
// Restaurant-Rollen, nur bekannte Events.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: role } = await supabase.rpc('get_my_role')
  if (!['restaurant_owner', 'admin', 'super_admin'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json().catch(() => ({})) as { event?: string; id?: string }
  const event = body.event as LiveEvent
  if (event !== 'restaurant_updated' && event !== 'deal_updated') {
    return NextResponse.json({ error: 'Unbekanntes Event' }, { status: 400 })
  }
  await broadcastLive(event, { id: body.id ?? null, by: user.id })
  return NextResponse.json({ ok: true })
}
