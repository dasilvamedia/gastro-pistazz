import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Google Places Auto-Sync
// Läuft täglich um 12:00 Uhr (Vercel Cron, eingestellt in vercel.json).
// Für jedes aktive Restaurant:
//   1. Wenn google_place_id fehlt → sucht es automatisch per Name + Stadt
//   2. Ruft Sterneschnitt + Bewertungsanzahl ab
//   3. Speichert in DB → sofort in der App sichtbar
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  // Sicherheitsprüfung: nur Vercel-Cron oder mit gültigem Secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: 'GOOGLE_PLACES_API_KEY nicht gesetzt. Bitte in Vercel Environment Variables eintragen.' },
      { status: 500 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Alle aktiven Restaurants laden
  const { data: restaurants, error: fetchError } = await supabase
    .from('restaurants')
    .select('id, name, city, address, google_place_id')
    .eq('is_active', true)

  if (fetchError || !restaurants?.length) {
    return NextResponse.json({ updated: 0, total: 0, error: fetchError?.message })
  }

  let updated = 0
  let discovered = 0
  const errors: string[] = []

  for (const restaurant of restaurants) {
    try {
      let placeId = restaurant.google_place_id

      // ── Schritt 1: Place ID suchen wenn noch nicht gesetzt ────────────────
      if (!placeId) {
        const query = [restaurant.name, restaurant.city, restaurant.address]
          .filter(Boolean)
          .join(' ')

        const searchRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
          `?input=${encodeURIComponent(query)}` +
          `&inputtype=textquery` +
          `&fields=place_id` +
          `&key=${GOOGLE_API_KEY}`
        )
        const searchData = await searchRes.json()
        placeId = searchData.candidates?.[0]?.place_id ?? null

        if (placeId) {
          // Place ID dauerhaft speichern → beim nächsten Lauf direkt nutzen
          await supabase
            .from('restaurants')
            .update({ google_place_id: placeId })
            .eq('id', restaurant.id)
          discovered++
        }
      }

      if (!placeId) {
        errors.push(`${restaurant.name}: Place ID nicht gefunden`)
        continue
      }

      // ── Schritt 2: Aktuelle Bewertung abrufen ─────────────────────────────
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${placeId}` +
        `&fields=rating,user_ratings_total` +
        `&key=${GOOGLE_API_KEY}`
      )
      const detailsData = await detailsRes.json()

      if (detailsData.status !== 'OK') {
        errors.push(`${restaurant.name}: Google API Status ${detailsData.status}`)
        continue
      }

      const { rating, user_ratings_total } = detailsData.result ?? {}

      if (rating != null) {
        await supabase
          .from('restaurants')
          .update({
            google_rating: Math.round(rating * 10) / 10,   // z.B. 4.2
            google_review_count: user_ratings_total ?? null,
          })
          .eq('id', restaurant.id)
        updated++
      }

    } catch (err: any) {
      errors.push(`${restaurant.name}: ${err.message}`)
    }
  }

  const result = {
    success: true,
    timestamp: new Date().toISOString(),
    total: restaurants.length,
    updated,
    discovered,          // Neue Place IDs automatisch gefunden
    errors: errors.length ? errors : undefined,
  }

  console.log('[cron/sync-google-ratings]', result)
  return NextResponse.json(result)
}
