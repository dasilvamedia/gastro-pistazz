import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function geocode(address: string, zip: string, city: string, name: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, ${zip} ${city}, Germany`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { 'User-Agent': 'gastro-pistazz/1.0' } }
    )
    const data = await res.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
    // Fallback: search by name + city only
    const fallback = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${name} ${city}`)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'gastro-pistazz/1.0' } }
    )
    const fallbackData = await fallback.json()
    if (fallbackData?.[0]) return { lat: parseFloat(fallbackData[0].lat), lon: parseFloat(fallbackData[0].lon) }
    return null
  } catch {
    return null
  }
}

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
      name, slug, type, city, address, zip, phone, email: restaurantEmail,
      website, instagram_handle, description, primary_color, points_per_story,
      owner_name, owner_password,
    } = body

    if (!slug || !owner_password || !name) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }

    const admin = createAdminClient()
    const internalEmail = `${slug}@gastro.pistazz.io`

    // Geocode address in parallel with user creation
    const coordsPromise = (address && city)
      ? geocode(address, zip || '', city, name)
      : Promise.resolve(null)

    // 1. Create Supabase user for the restaurant owner
    const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: owner_password,
      email_confirm: true,
      user_metadata: { full_name: owner_name || name },
    })

    if (createUserError) {
      if (createUserError.message?.includes('already been registered') || createUserError.message?.includes('already exists')) {
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existing = existingUsers?.users?.find(u => u.email === internalEmail)
        if (existing) {
          const coords = await coordsPromise
          await admin.auth.admin.updateUserById(existing.id, { password: owner_password })
          await admin.from('profiles').update({ full_name: owner_name || name }).eq('id', existing.id)
          await admin.from('restaurants').update({
            owner_id: existing.id,
            ...(coords ? { latitude: coords.lat, longitude: coords.lon } : {}),
          }).eq('slug', slug)
          return NextResponse.json({ ok: true, updated: true })
        }
      }
      return NextResponse.json({ error: createUserError.message }, { status: 500 })
    }

    const ownerId = newUser.user.id

    // 2. Create/update profile
    const { error: profileError } = await admin.from('profiles').upsert({
      id: ownerId,
      full_name: owner_name || name,
      role: 'restaurant_owner',
      onboarding_completed: true,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(ownerId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // 3. Geocode result + create restaurant
    const coords = await coordsPromise
    const VALID_DB_TYPES = ['restaurant', 'bar', 'cafe', 'fine_dining', 'biergarten', 'eisdiele']
    const safeType = type && VALID_DB_TYPES.includes(type) ? type : 'restaurant'

    const { error: restaurantError } = await admin.from('restaurants').upsert({
      name,
      slug,
      type: safeType,
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
      ...(coords ? { latitude: coords.lat, longitude: coords.lon } : {}),
    }, { onConflict: 'slug' })

    if (restaurantError) {
      await admin.auth.admin.deleteUser(ownerId)
      return NextResponse.json({ error: restaurantError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, owner_id: ownerId, login_name: slug, geocoded: !!coords })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
