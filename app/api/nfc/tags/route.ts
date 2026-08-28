import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getOwnedRestaurantId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('restaurants').select('id').eq('owner_id', userId).single()
  return data?.id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const restaurantId = await getOwnedRestaurantId(supabase, user.id)
  if (!restaurantId) return NextResponse.json({ error: 'kein Restaurant' }, { status: 403 })

  const { data: tags } = await supabase
    .from('nfc_tags')
    .select('id, tag_uid, label, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tags: tags ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const restaurantId = await getOwnedRestaurantId(supabase, user.id)
  if (!restaurantId) return NextResponse.json({ error: 'kein Restaurant' }, { status: 403 })

  const { tag_uid, label } = await req.json()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const restaurantId = await getOwnedRestaurantId(supabase, user.id)
  if (!restaurantId) return NextResponse.json({ error: 'kein Restaurant' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('nfc_tags').delete().eq('id', id).eq('restaurant_id', restaurantId)

  return NextResponse.json({ ok: true })
}
