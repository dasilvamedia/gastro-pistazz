import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRestaurant } from '@/lib/dashboard/resolveRestaurant'
import { notifyUsers } from '@/lib/notifyUser'
import { filterSegment, type SegmentCustomer as Customer } from '@/lib/notifications/segments'

// Kampagnen: Inhaber an die eigenen Kunden (Segmente), Super-Admin
// plattformweit. Empfaenger kommen ausschliesslich aus restaurant_customers
// (RPC, 032), nie aus einer ungefilterten profiles-Abfrage.

const schema = z.object({
  scope: z.enum(['restaurant', 'global']).default('restaurant'),
  restaurant_id: z.string().uuid().optional(),
  segment: z.string().min(1).max(40).default('alle'),
  user_ids: z.array(z.string().uuid()).max(500).optional(),
  city: z.string().max(80).optional(),
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(2).max(500),
  url: z.string().max(300).optional(),
  push: z.boolean().default(true),
})

const MAX_CAMPAIGNS_PER_DAY = 2

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bitte Titel (2 bis 80 Zeichen) und Text (bis 500 Zeichen) pruefen' }, { status: 400 })
  const input = parsed.data
  const admin = createAdminClient()

  const { restaurant, isSuperAdmin, role } = await resolveRestaurant(user.id, input.restaurant_id)
  if (!role || !['restaurant_owner', 'admin', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let recipients: string[] = []
  let restaurantId: string | null = null

  if (input.scope === 'global') {
    if (!isSuperAdmin) return NextResponse.json({ error: 'Nur Super-Admin' }, { status: 403 })
    if (input.user_ids?.length) {
      recipients = input.user_ids
    } else if (input.segment === 'inhaber') {
      const { data } = await admin.from('profiles').select('id').eq('role', 'restaurant_owner')
      recipients = (data ?? []).map(p => p.id)
    } else if (input.segment === 'test') {
      recipients = [user.id]
    } else if (input.segment === 'stadt' && input.city) {
      // Gaeste, die in dieser Stadt Kunde eines Restaurants sind
      const { data: rests } = await admin.from('restaurants').select('id').ilike('city', input.city)
      const ids = new Set<string>()
      for (const r of rests ?? []) {
        const { data } = await admin.rpc('restaurant_customers', { p_restaurant_id: r.id })
        for (const c of (data ?? []) as Customer[]) ids.add(c.user_id)
      }
      recipients = [...ids]
    } else {
      const { data } = await admin.from('profiles').select('id').eq('role', 'guest')
      recipients = (data ?? []).map(p => p.id)
    }
  } else {
    if (!restaurant) return NextResponse.json({ error: 'Kein Restaurant' }, { status: 403 })
    restaurantId = restaurant.id

    // Drossel: max 2 Kampagnen pro Restaurant und Tag (Admin ausgenommen)
    if (!isSuperAdmin) {
      const since = new Date(Date.now() - 86400000).toISOString()
      const { count } = await admin.from('notification_campaigns').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId).gte('created_at', since)
      if ((count ?? 0) >= MAX_CAMPAIGNS_PER_DAY) {
        return NextResponse.json({ error: `Maximal ${MAX_CAMPAIGNS_PER_DAY} Kampagnen pro Tag, damit deine Gaeste nicht genervt sind.` }, { status: 429 })
      }
    }

    const { data: customers, error } = await admin.rpc('restaurant_customers', { p_restaurant_id: restaurantId })
    if (error) return NextResponse.json({ error: 'Kunden konnten nicht geladen werden' }, { status: 500 })
    const all = (customers ?? []) as Customer[]
    if (input.user_ids?.length) {
      const allowed = new Set(all.map(c => c.user_id))
      recipients = input.user_ids.filter(id => allowed.has(id))
    } else {
      recipients = filterSegment(all, input.segment)
    }
  }

  if (recipients.length === 0) return NextResponse.json({ error: 'Keine Empfaenger in diesem Segment' }, { status: 404 })

  const result = await notifyUsers(recipients, {
    title: input.title, body: input.body, url: input.url, restaurant_id: restaurantId, push: input.push,
  })

  await admin.from('notification_campaigns').insert({
    restaurant_id: restaurantId,
    sender_id: user.id,
    scope: input.scope,
    segment: input.user_ids?.length ? 'einzeln' : input.segment,
    title: input.title,
    body: input.body,
    url: input.url ?? null,
    recipient_count: recipients.length,
    push_sent: result.push.web + result.push.ios,
  })

  return NextResponse.json({ ok: true, recipients: recipients.length, ...result })
}
