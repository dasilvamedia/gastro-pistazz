// Fix remaining restaurant images
// Run: node scripts/fix-remaining-images.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const updates = [
  // Barfüsser Wirtshaus Aalen — ID known from previous run
  {
    id: '661153ea-2419-4f11-9830-0e128cf837da',
    logo_url:  'https://www.barfuesser-aalen.de/wp-content/uploads/2022/02/logo.svg',
    cover_url: 'https://img02.restaurantguru.com/cc37-Barfusser-Hausbrauerei-Aalen-food.jpg',
    website:   'https://www.barfuesser-aalen.de/',
    note: 'Barfüsser Wirtshaus Aalen',
  },
  // Enchilada Aalen — fix logo (old URL was 404) + better cover
  {
    name_ilike: '%enchilada%',
    logo_url:  'https://www.enchilada.de/theme/images/logo.svg',
    cover_url: 'https://media.enchilada.de/media/w/500/h/500/zentral/Enchilada_2024/Galerien/Signature_Gerichte/Enchiladas_Carne_Enchilada.jpg',
    website:   'https://enchilada.de/aalen/',
    note: 'Enchilada Aalen',
  },
  // Aposto Aalen — fix cover (restaurantguru URL was 404) + brand logo
  {
    name_ilike: '%aposto%',
    logo_url:  'https://www.aposto.eu/theme/images/logo.svg',
    cover_url: 'https://www.aposto.eu/media/Standorte/Aalen/Header/Header_Aalen.jpg',
    website:   'https://aalen.aposto.eu/',
    note: 'Aposto Aalen',
  },
]

let ok = 0
let fail = 0

for (const u of updates) {
  const payload = {
    logo_url:  u.logo_url,
    cover_url: u.cover_url,
    ...(u.website ? { website: u.website } : {}),
  }

  let result
  if (u.id) {
    result = await supabase.from('restaurants').update(payload).eq('id', u.id).select('id, name')
  } else {
    result = await supabase.from('restaurants').update(payload).ilike('name', u.name_ilike).select('id, name')
  }

  const { data, error } = result
  if (error) {
    console.error(`❌ ${u.note}: ${error.message}`)
    fail++
  } else if (!data?.length) {
    console.warn(`⚠️  ${u.note}: no rows matched`)
    fail++
  } else {
    console.log(`✅ ${u.note}: updated ${data.map(r => r.name).join(', ')}`)
    ok++
  }
}

// The Jaxt — check if it exists in DB, set placeholder if no images found
const { data: jaxt } = await supabase
  .from('restaurants')
  .select('id, name, logo_url, cover_url')
  .ilike('name', '%jaxt%')

if (jaxt?.length) {
  console.log(`ℹ️  The Jaxt found: ${jaxt[0].name} — logo: ${jaxt[0].logo_url ?? 'none'}, cover: ${jaxt[0].cover_url ?? 'none'}`)
  if (!jaxt[0].cover_url) {
    // Use a generic gastro placeholder (Unsplash free to use)
    const { error } = await supabase
      .from('restaurants')
      .update({
        cover_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      })
      .eq('id', jaxt[0].id)
    if (!error) console.log(`✅ The Jaxt: set generic cover placeholder`)
    else console.error(`❌ The Jaxt cover update failed: ${error.message}`)
  }
} else {
  console.log(`ℹ️  The Jaxt: not found in DB`)
}

console.log(`\nDone: ${ok} ok, ${fail} failed`)
