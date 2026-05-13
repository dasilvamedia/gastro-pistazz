import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../lib/supabase/admin'

export async function geocodeAll() {
  const admin = createAdminClient()
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, address, city')
    .or('latitude.is.null,longitude.is.null')

  let updated = 0, skipped = 0, errors = 0

  for (const r of restaurants ?? []) {
    const query = r.address ? `${r.address}, ${r.city}, Deutschland` : `${r.name}, ${r.city}, Deutschland`

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'gastro-pistazz/1.0 contact@pistazz.io' }
      })
      const json = await res.json() as { lat?: string; lon?: string }[]

      if (json.length > 0 && json[0].lat) {
        const { error: updateErr } = await admin
          .from('restaurants')
          .update({ latitude: parseFloat(json[0].lat!), longitude: parseFloat(json[0].lon!) })
          .eq('id', r.id)

        if (updateErr) throw updateErr
        console.log(`  ✓ ${r.name}: ${json[0].lat}, ${json[0].lon}`)
        updated++
      } else {
        console.log(`  - ${r.name}: not found`)
        skipped++
      }

      // Nominatim rate limit: 1 req/s
      await new Promise(resolve => setTimeout(resolve, 1100))
    } catch (e: unknown) {
      console.error(`  ✗ ${r.name}: ${(e as Error).message}`)
      errors++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`)
}

geocodeAll().catch(console.error)
