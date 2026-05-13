import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../lib/supabase/admin'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export async function fetchOpeningHours() {
  if (!API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set — skipping Google fetch')
    return
  }

  const admin = createAdminClient()
  const { data: restaurants, error } = await admin
    .from('restaurants')
    .select('id, name, google_place_id, opening_hours')
    .not('google_place_id', 'is', null)

  if (error) throw error

  let updated = 0, skipped = 0, errors = 0

  for (const r of restaurants ?? []) {
    if (!r.google_place_id) { skipped++; continue }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r.google_place_id}&fields=opening_hours&key=${API_KEY}`
      const res = await fetch(url)
      const json = await res.json() as { result?: { opening_hours?: { periods?: { open: { day: number; time: string }; close?: { day: number; time: string } }[] } } }

      if (json.result?.opening_hours?.periods) {
        const hours: Record<string, { open: string; close: string; closed?: boolean }> = {}
        // Mark all days as closed first
        DAY_KEYS.forEach(k => { hours[k] = { open: '', close: '', closed: true } })

        for (const period of json.result.opening_hours.periods) {
          const dayKey = DAY_KEYS[period.open.day]
          const openTime = `${period.open.time.slice(0, 2)}:${period.open.time.slice(2)}`
          const closeTime = period.close ? `${period.close.time.slice(0, 2)}:${period.close.time.slice(2)}` : '23:59'
          hours[dayKey] = { open: openTime, close: closeTime, closed: false }
        }

        const { error: updateErr } = await admin
          .from('restaurants')
          .update({ opening_hours: hours })
          .eq('id', r.id)

        if (updateErr) throw updateErr
        console.log(`  ✓ ${r.name}`)
        updated++
      } else {
        console.log(`  - ${r.name} (no hours from Google)`)
        skipped++
      }

      // Rate limit: 10 req/s
      await new Promise(resolve => setTimeout(resolve, 120))
    } catch (e: unknown) {
      console.error(`  ✗ ${r.name}: ${(e as Error).message}`)
      errors++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`)
}

fetchOpeningHours().catch(console.error)
