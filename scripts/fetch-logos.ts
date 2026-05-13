import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../lib/supabase/admin'

function svgInitials(name: string, color = '#8BB06A'): string {
  const words = name.trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (words[0].slice(0, 2)).toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="${color}"/><text x="100" y="100" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" font-size="80" font-weight="700" fill="white">${initials}</text></svg>`
}

export async function fetchLogos() {
  const admin = createAdminClient()
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, website, logo_url, primary_color')
    .is('logo_url', null)

  let updated = 0, errors = 0

  for (const r of restaurants ?? []) {
    try {
      let logoUrl: string | null = null

      // Try Clearbit if website available
      if (r.website) {
        try {
          const domain = new URL(r.website).hostname.replace('www.', '')
          const clearbitUrl = `https://logo.clearbit.com/${domain}`
          const check = await fetch(clearbitUrl, { method: 'HEAD' })
          if (check.ok) logoUrl = clearbitUrl
        } catch { /* ignore */ }
      }

      // Fallback: generate SVG initials and upload to Supabase Storage
      if (!logoUrl) {
        const svg = svgInitials(r.name, r.primary_color ?? '#8BB06A')
        const fileName = `logos/${r.id}/logo.svg`
        const { error: uploadErr } = await admin.storage
          .from('restaurant-assets')
          .upload(fileName, Buffer.from(svg), {
            contentType: 'image/svg+xml',
            upsert: true,
          })

        if (!uploadErr) {
          const { data: { publicUrl } } = admin.storage
            .from('restaurant-assets')
            .getPublicUrl(fileName)
          logoUrl = publicUrl
        }
      }

      if (logoUrl) {
        await admin.from('restaurants').update({ logo_url: logoUrl }).eq('id', r.id)
        console.log(`  ✓ ${r.name} → ${logoUrl}`)
        updated++
      }
    } catch (e: unknown) {
      console.error(`  ✗ ${r.name}: ${(e as Error).message}`)
      errors++
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`)
}

fetchLogos().catch(console.error)
