import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify caller is super_admin or admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }
    const { data: callerRole } = await supabase.rpc('get_my_role')
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const {
      // Restaurant fields
      name, slug, type, city, address, zip, phone, email: restaurantEmail,
      website, instagram_handle, description, primary_color, points_per_story,
      // Owner fields
      owner_name, owner_password,
    } = body

    if (!slug || !owner_password || !name) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Internal email: slug@gastro.pistazz.io (never shown to owner)
    const internalEmail = `${slug}@gastro.pistazz.io`

    // 1. Create Supabase user for the restaurant owner
    const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: owner_password,
      email_confirm: true, // skip email verification
      user_metadata: { full_name: owner_name || name },
    })

    if (createUserError) {
      // If user already exists, update password instead
      if (createUserError.message?.includes('already been registered') || createUserError.message?.includes('already exists')) {
        // Look up existing user
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existing = existingUsers?.users?.find(u => u.email === internalEmail)
        if (existing) {
          await admin.auth.admin.updateUserById(existing.id, { password: owner_password })
          // Update profile name
          await admin.from('profiles').update({ full_name: owner_name || name }).eq('id', existing.id)
          // Update restaurant owner_id if restaurant already exists
          await admin.from('restaurants').update({ owner_id: existing.id }).eq('slug', slug)
          return NextResponse.json({ ok: true, updated: true })
        }
      }
      return NextResponse.json({ error: createUserError.message }, { status: 500 })
    }

    const ownerId = newUser.user.id

    // 2. Create/update profile for the owner
    const { error: profileError } = await admin.from('profiles').upsert({
      id: ownerId,
      full_name: owner_name || name,
      role: 'restaurant_owner',
      onboarding_completed: true,
    })

    if (profileError) {
      // Clean up user if profile fails
      await admin.auth.admin.deleteUser(ownerId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // 3. Create restaurant
    const { error: restaurantError } = await admin.from('restaurants').insert({
      name,
      slug,
      type: type || 'restaurant',
      city: city || null,
      address: address || null,
      zip: zip || null,
      phone: phone || null,
      email: restaurantEmail || null,
      website: website || null,
      instagram_handle: instagram_handle || null,
      description: description || null,
      primary_color: primary_color || '#8BB06A',
      points_per_story: points_per_story ?? 500,
      owner_id: ownerId,
      is_active: true,
    })

    if (restaurantError) {
      await admin.auth.admin.deleteUser(ownerId)
      return NextResponse.json({ error: restaurantError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, owner_id: ownerId, login_name: slug })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
