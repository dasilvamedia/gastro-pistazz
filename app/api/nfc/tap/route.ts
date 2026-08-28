import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Nutzer haelt Handy an einen registrierten NFC-Tag im Restaurant -> ein
// Stempel wird automatisch vergeben. Kein Foto/Standort noetig: wer den
// physischen Tag ausliest, ist zwangslaeufig vor Ort.
const COOLDOWN_HOURS = 4

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { tag_uid } = await req.json()
  if (!tag_uid || typeof tag_uid !== 'string') {
    return NextResponse.json({ error: 'tag_uid fehlt' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: tag } = await admin
    .from('nfc_tags')
    .select('id, restaurant_id')
    .eq('tag_uid', tag_uid.trim().toUpperCase())
    .single()

  if (!tag) return NextResponse.json({ error: 'unknown_tag' }, { status: 404 })

  // Cooldown: derselbe Nutzer bekommt pro Restaurant nur alle paar Stunden
  // einen neuen Stempel (verhindert Spam-Tapping fuer schnelle Kartenfuellung)
  const since = new Date(Date.now() - COOLDOWN_HOURS * 3600_000).toISOString()
  const { data: recent } = await admin
    .from('nfc_stamp_taps')
    .select('id')
    .eq('user_id', user.id)
    .eq('restaurant_id', tag.restaurant_id)
    .gte('created_at', since)
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json({ error: 'cooldown', cooldownHours: COOLDOWN_HOURS }, { status: 429 })
  }

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('stamp_card_total, stamp_card_reward, name')
    .eq('id', tag.restaurant_id)
    .single()
  const totalRequired = restaurant?.stamp_card_total ?? 8

  const { data: existingCard } = await admin
    .from('stamp_cards')
    .select('id, current_stamps, is_completed')
    .eq('user_id', user.id)
    .eq('restaurant_id', tag.restaurant_id)
    .maybeSingle()

  let card
  if (existingCard) {
    if (existingCard.is_completed) {
      return NextResponse.json({ error: 'card_already_complete' }, { status: 409 })
    }
    const newCount = existingCard.current_stamps + 1
    const completed = newCount >= totalRequired
    const { data: updated } = await admin
      .from('stamp_cards')
      .update({
        current_stamps: newCount,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', existingCard.id)
      .select('current_stamps, total_stamps_required, is_completed')
      .single()
    card = updated
  } else {
    const { data: created } = await admin
      .from('stamp_cards')
      .insert({
        user_id: user.id,
        restaurant_id: tag.restaurant_id,
        current_stamps: 1,
        total_stamps_required: totalRequired,
        is_completed: totalRequired <= 1,
      })
      .select('current_stamps, total_stamps_required, is_completed')
      .single()
    card = created
  }

  await admin.from('nfc_stamp_taps').insert({
    user_id: user.id,
    restaurant_id: tag.restaurant_id,
    nfc_tag_id: tag.id,
  })

  return NextResponse.json({
    ok: true,
    restaurant_name: restaurant?.name ?? null,
    reward: restaurant?.stamp_card_reward ?? null,
    card,
  })
}
