import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('restaurants')
  .select('name, city, logo_url, cover_url, website, instagram_handle')
  .order('name')

if (error) { console.error(error.message); process.exit(1) }

console.log(`\n${'Restaurant'.padEnd(30)} ${'Logo'.padEnd(6)} ${'Cover'.padEnd(6)} Website`)
console.log('─'.repeat(80))
for (const r of data) {
  const logo  = r.logo_url  ? '✅' : '❌'
  const cover = r.cover_url ? '✅' : '❌'
  const site  = r.website ? r.website.replace('https://','').slice(0,30) : '—'
  console.log(`${(r.name + ' (' + r.city + ')').padEnd(30)} ${logo.padEnd(6)} ${cover.padEnd(6)} ${site}`)
}
console.log(`\nTotal: ${data.length} restaurants`)
