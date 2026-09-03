import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRestaurant } from '@/lib/dashboard/resolveRestaurant'

// Inhaber verwaltet die NFC-Tags seines Restaurants. Super-Admin darf das
// fuer jedes Restaurant (per ?restaurant_id= / body.restaurant_id oder
// Kundenansicht-Cookie), vorher war er hier ausgesperrt.
async function resolveForRequest(requestedId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, restaurantId: null }
  const { restaurant } = await resolveRestaurant(user.id, requestedId)
  return { user, restaurantId: (restaurant?.id as string | undefined) ?? null }
}

export async function GET(req: NextRequest) {
  const { user, restaurantId } = await resolveForRequest(req.nextUrl.searchParams.get('restaurant_id'))
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!restaurantId) return NextResponse.json({ error: 'kein Restaurant' }, { status: 403 })

  const admin = createAdminClient()
  const { data: tags } = await admin
    .from('nfc_tags')
    .select('id, tag_uid, label, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tags: tags ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user, restaurantId } = await resolveForRequest(body.restaurant_id ?? null)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!restaurantId) return NextResponse.json({ error: 'kein Restaurant' }, { status: 403 })

  const { tag_uid, label } = body
  if (!tag_uid || typeof tag_uid !== 'string') {
    return NextResponse.json({ error: 'tag_uid fehlt' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('nfc_tags')
    .insert({
      restaurant_id: restaurantId,
      tag_uid: tag_uid.trim().toUpperCase(),
      label: label || null,
      created_by: user.id,
    })
    .select('id, tag_uid, label, created_at')
    .single()

  if (error) {
    const msg = error.code === '23505' ? 'Dieser Tag ist bereits registriert' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ tag: data })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { user, restaurantId } = await resolveForRequest(body.restaurant_id ?? null)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!restaurantId) return NextResponse.json({ error: 'kein Restaurant' }, { status: 403 })

  const { id } = body
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('nfc_tags').delete().eq('id', id).eq('restaurant_id', restaurantId)

  return NextResponse.json({ ok: true })
}
