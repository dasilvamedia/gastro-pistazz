import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const updates = [
  {
    name_ilike: '%osteria%',
    logo_url:  'https://www.losteria.de/_assets/ddbb53fc6fe32c34dae6c9159067e190/img/2x/losteria_logo_2x.png',
    cover_url: 'http://losteria-aalen.com/wp-content/uploads/2018/07/Theke.jpg',
    website:   'http://losteria-aalen.com/',
    note: 'Osteria Aalen',
  },
  {
    name_ilike: '%waldsch%',
    logo_url:  'https://www.waldschaenke-ellwangen.de/wp-content/uploads/waldschaenke-restaurant-logo.png',
    cover_url: 'https://www.waldschaenke-ellwangen.de/wp-content/uploads/waldschaenke-restaurant-ellwangen-eingang.jpg',
    website:   'https://www.waldschaenke-ellwangen.de/',
    note: 'Waldschänke Ellwangen',
  },
  {
    name_ilike: '%jaxt%',
    logo_url:  null,   // no logo found — keep null
    cover_url: 'https://www.magazin-kueche.de/fileadmin/_processed_/d/d/csm_WEB_bild2_d32f0755fd.jpg',
    note: 'The Jaxt Ellwangen',
  },
]

let ok = 0
let skip = 0

for (const u of updates) {
  const payload = {}
  if (u.logo_url  !== undefined && u.logo_url  !== null) payload.logo_url  = u.logo_url
  if (u.cover_url !== undefined && u.cover_url !== null) payload.cover_url = u.cover_url
  if (u.website)   payload.website = u.website

  if (!Object.keys(payload).length) {
    console.log(`⏭  ${u.note}: nothing to update`)
    skip++
    continue
  }

  const { data, error } = await supabase
    .from('restaurants')
    .update(payload)
    .ilike('name', u.name_ilike)
    .select('id, name')

  if (error) {
    console.error(`❌ ${u.note}: ${error.message}`)
  } else if (!data?.length) {
    console.warn(`⚠️  ${u.note}: no rows matched`)
  } else {
    console.log(`✅ ${u.note}: updated "${data[0].name}"`)
    ok++
  }
}

console.log(`\nDone: ${ok} updated, ${skip} skipped`)
