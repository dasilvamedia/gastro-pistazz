import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const RESTAURANTS = [
  { email: 'aposto@gastro.pistazz.io', password: 'Aposto2026!', name: 'Aposto Aalen', slug: 'aposto-aalen', city: 'Aalen' },
  { email: 'enchilada@gastro.pistazz.io', password: 'Enchilada2026!', name: 'Enchilada Aalen', slug: 'enchilada-aalen', city: 'Aalen' },
  { email: 'barfuesser@gastro.pistazz.io', password: 'Barfuesser2026!', name: 'Barfüsser Wirtshaus', slug: 'barfuesser-aalen', city: 'Aalen' },
  { email: 'yuma@gastro.pistazz.io', password: 'YumaSushi2026!', name: 'Yuma Sushi & Tapas', slug: 'yuma-aalen', city: 'Aalen' },
  { email: 'rambazamba@gastro.pistazz.io', password: 'Rambazamba2026!', name: 'Rambazamba Aalen', slug: 'rambazamba-aalen', city: 'Aalen' },
  { email: 'osteria@gastro.pistazz.io', password: 'Osteria2026!', name: 'Osteria Aalen', slug: 'osteria-aalen', city: 'Aalen' },
  { email: 'podium@gastro.pistazz.io', password: 'Podium2026!', name: 'Stefanie Winter – Podium', slug: 'podium-aalen', city: 'Aalen' },
  { email: 'konrad@gastro.pistazz.io', password: 'Konrad2026!', name: 'Stefanie Winter – Konrad', slug: 'konrad-aalen', city: 'Aalen' },
  { email: 'rosmarie@gastro.pistazz.io', password: 'Rosmarie2026!', name: 'Rosmarie', slug: 'rosmarie-gmuend', city: 'Schwäbisch Gmünd' },
  { email: 'hicharles@gastro.pistazz.io', password: 'HiCharles2026!', name: 'Hi, Charles', slug: 'hi-charles-gmuend', city: 'Schwäbisch Gmünd' },
  { email: 'bassano@gastro.pistazz.io', password: 'Bassano2026!', name: 'Bassano Bar', slug: 'bassano-gmuend', city: 'Schwäbisch Gmünd' },
  { email: 'thejaxt@gastro.pistazz.io', password: 'TheJaxt2026!', name: 'The Jaxt', slug: 'the-jaxt-ellwangen', city: 'Ellwangen' },
  { email: 'rosengarten@gastro.pistazz.io', password: 'Rosengarten2026!', name: 'Rosengarten', slug: 'rosengarten-ellwangen', city: 'Ellwangen' },
  { email: 'leuchtturm@gastro.pistazz.io', password: 'Leuchtturm2026!', name: 'Leuchtturm', slug: 'leuchtturm-bucher-stausee', city: 'Bucher Stausee' },
  { email: 'beachbar@gastro.pistazz.io', password: 'BeachBar2026!', name: 'Beach Bar', slug: 'beach-bar-bucher-stausee', city: 'Bucher Stausee' },
  { email: 'waldschaenke@gastro.pistazz.io', password: 'Waldschaenke2026!', name: 'Pierre Grebenisan – Waldschänke', slug: 'waldschaenke-ellwangen', city: 'Ellwangen' },
]

export async function POST() {
  // Verify caller is super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'super_admin' && role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  const admin = createAdminClient()
  const results: { name: string; status: string }[] = []

  for (const r of RESTAURANTS) {
    let userId: string | null = null

    try {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: r.email,
        password: r.password,
        email_confirm: true,
        user_metadata: { full_name: r.name },
      })

      if (createErr) {
        if (createErr.message?.includes('already') || createErr.message?.includes('exists')) {
          const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
          const existing = users.find(u => u.email === r.email)
          if (existing) {
            userId = existing.id
            await admin.auth.admin.updateUserById(userId, { password: r.password })
          }
        } else {
          results.push({ name: r.name, status: `Fehler: ${createErr.message}` })
          continue
        }
      } else {
        userId = created.user.id
      }

      if (!userId) {
        results.push({ name: r.name, status: 'User-ID fehlt' })
        continue
      }

      // Upsert profile, then explicitly update role (trigger may reset it to 'guest')
      await admin.from('profiles').upsert({
        id: userId,
        full_name: r.name,
        role: 'restaurant_owner',
        onboarding_completed: true,
      })
      await admin.from('profiles').update({ role: 'restaurant_owner', onboarding_completed: true }).eq('id', userId)

      // Check if restaurant with slug exists
      const { data: existingRest } = await admin.from('restaurants').select('id').eq('slug', r.slug).single()
      if (existingRest) {
        await admin.from('restaurants').update({ owner_id: userId }).eq('slug', r.slug)
      } else {
        await admin.from('restaurants').insert({
          name: r.name,
          slug: r.slug,
          type: 'restaurant',
          city: r.city,
          owner_id: userId,
          is_active: true,
          primary_color: '#8BB06A',
          points_per_story: 500,
        })
      }

      results.push({ name: r.name, status: 'OK ✓' })
    } catch (e: unknown) {
      results.push({ name: r.name, status: `Fehler: ${(e as Error).message}` })
    }
  }

  // Set super admin roles
  const adminEmails = ['dasilvamedia@icloud.com', 'dasilvamedias@gmail.com']
  for (const email of adminEmails) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const adminUser = users.find(u => u.email === email)
    if (adminUser) {
      await admin.from('profiles').upsert({
        id: adminUser.id,
        full_name: 'Marcio da Silva',
        role: 'super_admin',
        onboarding_completed: true,
      })
      results.push({ name: `Super Admin (${email})`, status: 'OK ✓' })
    }
  }

  return NextResponse.json({ ok: true, results })
}
