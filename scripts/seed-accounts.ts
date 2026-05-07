import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../lib/supabase/admin'

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

export async function main() {
  const admin = createAdminClient()

  // Seed restaurant owner accounts
  for (const r of RESTAURANTS) {
    console.log(`\nProcessing: ${r.name} (${r.email})`)

    let userId: string

    // Try creating the user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: r.email,
      password: r.password,
      email_confirm: true,
      user_metadata: { full_name: r.name },
    })

    if (createErr) {
      if (createErr.message?.includes('already been registered') || (createErr as { code?: string }).code === 'email_exists') {
        console.log(`  User exists, looking up by email...`)
        // Look up existing user
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const existing = listData?.users?.find(u => u.email === r.email)
        if (!existing) {
          console.error(`  Could not find existing user for ${r.email}`)
          continue
        }
        userId = existing.id
        // Update password
        await admin.auth.admin.updateUserById(userId, { password: r.password })
        console.log(`  Updated password for existing user: ${userId}`)
      } else {
        console.error(`  Failed to create user: ${createErr.message}`)
        continue
      }
    } else {
      userId = created.user.id
      console.log(`  Created new user: ${userId}`)
    }

    // Upsert profile
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      full_name: r.name,
      role: 'restaurant_owner',
      onboarding_completed: true,
    }, { onConflict: 'id' })

    if (profileErr) {
      console.error(`  Failed to upsert profile: ${profileErr.message}`)
    } else {
      console.log(`  Profile upserted`)
    }

    // Check if restaurant with this slug exists
    const { data: existingRest } = await admin
      .from('restaurants')
      .select('id')
      .eq('slug', r.slug)
      .single()

    if (existingRest) {
      // Update owner_id on existing restaurant
      const { error: updateRestErr } = await admin
        .from('restaurants')
        .update({ owner_id: userId })
        .eq('slug', r.slug)
      if (updateRestErr) {
        console.error(`  Failed to update restaurant owner: ${updateRestErr.message}`)
      } else {
        console.log(`  Restaurant already exists, updated owner_id`)
      }
    } else {
      // Insert new restaurant
      const { error: insertRestErr } = await admin.from('restaurants').insert({
        name: r.name,
        slug: r.slug,
        type: 'restaurant',
        city: r.city,
        owner_id: userId,
        is_active: true,
        primary_color: '#8BB06A',
        points_per_story: 500,
      })
      if (insertRestErr) {
        console.error(`  Failed to insert restaurant: ${insertRestErr.message}`)
      } else {
        console.log(`  Restaurant created`)
      }
    }
  }

  // Seed super admin accounts
  console.log('\nProcessing super admin accounts...')
  const SUPER_ADMIN_EMAILS = ['dasilvamedia@icloud.com', 'dasilvamedias@gmail.com']

  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const allUsers = listData?.users ?? []

  for (const email of SUPER_ADMIN_EMAILS) {
    const user = allUsers.find(u => u.email === email)
    if (!user) {
      console.log(`  Super admin user not found: ${email}`)
      continue
    }
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: user.id,
      full_name: 'Marcio da Silva',
      role: 'super_admin',
      onboarding_completed: true,
    }, { onConflict: 'id' })

    if (profileErr) {
      console.error(`  Failed to upsert super admin profile (${email}): ${profileErr.message}`)
    } else {
      console.log(`  Super admin profile upserted for ${email} (${user.id})`)
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)
