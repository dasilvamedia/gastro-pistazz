import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

function svgInitials(name: string, color = '#8BB06A'): string {
  const words = name.trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="${color}"/><text x="100" y="100" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" font-size="80" font-weight="700" fill="white">${initials}</text></svg>`
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, website, primary_color')
    .is('logo_url', null)
    .limit(50)

  let updated = 0, errors = 0

  for (const r of restaurants ?? []) {
    try {
      let logoUrl: string | null = null

      if (r.website) {
        try {
          const domain = new URL(r.website).hostname.replace('www.', '')
          const clearbitUrl = `https://logo.clearbit.com/${domain}`
          const check = await fetch(clearbitUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
          if (check.ok) logoUrl = clearbitUrl
        } catch { /* ignore */ }
      }

      if (!logoUrl) {
        const svg = svgInitials(r.name, r.primary_color ?? '#8BB06A')
        const fileName = `logos/${r.id}/logo.svg`
        const { error: uploadErr } = await admin.storage
          .from('restaurant-assets')
          .upload(fileName, Buffer.from(svg), { contentType: 'image/svg+xml', upsert: true })

        if (!uploadErr) {
          const { data: { publicUrl } } = admin.storage
            .from('restaurant-assets')
            .getPublicUrl(fileName)
          logoUrl = publicUrl
        }
      }

      if (logoUrl) {
        await admin.from('restaurants').update({ logo_url: logoUrl }).eq('id', r.id)
        updated++
      }
    } catch {
      errors++
    }
  }

  const remaining = ((await admin.from('restaurants').select('id', { count: 'exact', head: true }).is('logo_url', null)).count ?? 0)

  return NextResponse.json({ updated, errors, remaining })
}
