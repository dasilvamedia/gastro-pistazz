import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Nutzer haelt Handy an einen registrierten NFC-Tag im Restaurant -> ein
// Stempel wird automatisch vergeben. Kein Foto/Standort noetig: wer den
// physischen Tag ausliest, ist zwangslaeufig vor Ort.
//
// Ist die Karte voll, bekommt sie einen Belohnungs-Code (QR + 8 Zeichen).
// Das Restaurant bestaetigt ihn (confirm_stamp_reward, 026), danach startet
// dieselbe Karte bei 0. Bis dahin liefert jeder weitere Tap den Code erneut
// statt einer Sackgasse.
const COOLDOWN_HOURS = 4
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genRewardCode() {
  let s = ''
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return s
}

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

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, name, slug, stamp_card_total, stamp_card_reward, stamp_card_enabled')
    .eq('id', tag.restaurant_id)
    .single()
  // Nur stempeln, wenn die Stempelkarte im Dashboard aktiviert ist
  if (restaurant && restaurant.stamp_card_enabled === false) {
    return NextResponse.json({ error: 'stamp_card_disabled' }, { status: 403 })
  }
  const totalRequired = restaurant?.stamp_card_total ?? 8
  const base = {
    restaurant_id: tag.restaurant_id,
    restaurant_name: restaurant?.name ?? null,
    restaurant_slug: restaurant?.slug ?? null,
    reward: restaurant?.stamp_card_reward ?? null,
  }

  const { data: existingCard } = await admin
    .from('stamp_cards')
    .select('id, current_stamps, total_stamps_required, is_completed, reward_redeemed, reward_code')
    .eq('user_id', user.id)
    .eq('restaurant_id', tag.restaurant_id)
    .maybeSingle()

  // Volle Karte: keinen Stempel, aber den Belohnungs-Code mitgeben
  if (existingCard?.is_completed) {
    let code = existingCard.reward_code as string | null
    if (!code) {
      code = await assignRewardCode(admin, existingCard.id)
    }
    return NextResponse.json({
      error: 'card_already_complete',
      ...base,
      reward_code: code,
      card: {
        current_stamps: existingCard.current_stamps,
        total_stamps_required: existingCard.total_stamps_required,
        is_completed: true,
        reward_code: code,
      },
    }, { status: 409 })
  }

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
    return NextResponse.json({ error: 'cooldown', cooldownHours: COOLDOWN_HOURS, ...base }, { status: 429 })
  }

  let card: { id: string; current_stamps: number; total_stamps_required: number; is_completed: boolean; reward_code: string | null } | null
  if (existingCard) {
    // Abschluss gegen den Snapshot der Karte pruefen (nicht gegen den
    // Live-Wert), sonst springt eine Karte bei Aenderung der Einstellung.
    const newCount = existingCard.current_stamps + 1
    const completed = newCount >= existingCard.total_stamps_required
    const { data: updated } = await admin
      .from('stamp_cards')
      .update({
        current_stamps: newCount,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCard.id)
      .select('id, current_stamps, total_stamps_required, is_completed, reward_code')
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
        completed_at: totalRequired <= 1 ? new Date().toISOString() : null,
      })
      .select('id, current_stamps, total_stamps_required, is_completed, reward_code')
      .single()
    card = created
  }

  if (card?.is_completed && !card.reward_code) {
    card.reward_code = await assignRewardCode(admin, card.id)
  }

  await admin.from('nfc_stamp_taps').insert({
    user_id: user.id,
    restaurant_id: tag.restaurant_id,
    nfc_tag_id: tag.id,
  })

  // Besuch zaehlen (027). Fehlt die Funktion noch, ist das kein Blocker.
  const { error: visitError } = await admin.rpc('record_nfc_visit', {
    p_user_id: user.id,
    p_restaurant_id: tag.restaurant_id,
  })
  if (visitError && !/function .* does not exist/i.test(visitError.message)) {
    console.error('record_nfc_visit error:', visitError)
  }

  return NextResponse.json({
    ok: true,
    ...base,
    reward_code: card?.reward_code ?? null,
    card: card ? {
      current_stamps: card.current_stamps,
      total_stamps_required: card.total_stamps_required,
      is_completed: card.is_completed,
      reward_code: card.reward_code,
    } : null,
  })
}

// Eindeutigen Belohnungs-Code setzen (Retry bei Kollision, 23505).
async function assignRewardCode(admin: ReturnType<typeof createAdminClient>, cardId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genRewardCode()
    const { error } = await admin
      .from('stamp_cards')
      .update({ reward_code: code })
      .eq('id', cardId)
    if (!error) return code
    if (error.code !== '23505') {
      console.error('assignRewardCode error:', error)
      return null
    }
  }
  return null
}
