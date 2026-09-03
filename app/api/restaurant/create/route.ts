import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { startTrial } from '@/lib/subscriptions'
import { slugify } from '@/lib/slug'
import { geocodeRestaurant } from '@/lib/geocode'
import { afterRestaurantChange } from '@/lib/restaurantCache'
import { TRIAL_DAYS, DEFAULT_PLAN, isPlanKey } from '@/lib/plans'

// 1-Klick-Anlage: Name + Stadt reichen. Alles andere wird abgeleitet:
// Slug (eindeutig), Inhaber-Konto mit generiertem Passwort + Magic-Link,
// Koordinaten (Google Places, sonst OpenStreetMap), Trial 30 Tage, sofort
// veroeffentlicht. "Store-Upload" gibt es nicht: die App laedt live.

const VALID_TYPES = ['restaurant', 'bar', 'cafe', 'fine_dining', 'biergarten', 'eisdiele'] as const

const schema = z.object({
  name: z.string().trim().min(2, 'Name mindestens 2 Zeichen'),
  city: z.string().trim().min(2, 'Stadt angeben'),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional().or(z.literal('')),
  type: z.enum(VALID_TYPES).optional(),
  address: z.string().trim().optional(),
  zip: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  website: z.string().trim().optional(),
  instagram_handle: z.string().trim().optional(),
  description: z.string().trim().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  points_per_story: z.number().int().min(0).optional(),
  owner_name: z.string().trim().optional(),
  owner_password: z.string().min(8).optional(),
  publish: z.boolean().optional(),
  trial_days: z.number().int().min(0).max(365).optional(),
  plan: z.string().optional(),
  lead_id: z.string().uuid().optional(),
})

const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
function generatePassword(len = 12) {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += PW_ALPHABET[bytes[i] % PW_ALPHABET.length]
  return out
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const { data: callerRole } = await supabase.rpc('get_my_role')
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return NextResponse.json({ error: first?.message ?? 'Ungueltige Eingabe' }, { status: 400 })
    }
    const body = parsed.data
    const admin = createAdminClient()

    // Lead-Daten als Vorbelegung (nur leere Felder fuellen)
    let lead: Record<string, unknown> | null = null
    if (body.lead_id) {
      const { data } = await admin.from('leads').select('*').eq('id', body.lead_id).maybeSingle()
      lead = data
    }
    const pick = (v: string | undefined, leadKey: string) =>
      (v && v.length > 0) ? v : (typeof lead?.[leadKey] === 'string' ? (lead![leadKey] as string) : undefined)

    const name = body.name
    const city = body.city
    const address = pick(body.address, 'adresse')
    const zip = pick(body.zip, 'plz')
    const phone = pick(body.phone, 'telefon')
    const email = pick(body.email, 'email')
    const website = pick(body.website, 'website')

    // Eindeutiger Slug: gewuenscht oder aus dem Namen, bei Kollision -2, -3, ...
    const base = (body.slug && body.slug.length >= 2) ? body.slug : slugify(name)
    if (base.length < 2) return NextResponse.json({ error: 'Aus dem Namen laesst sich kein Login-Name bilden' }, { status: 400 })
    let slug = base
    for (let n = 2; n < 50; n++) {
      const { data: taken } = await admin.from('restaurants').select('id').eq('slug', slug).maybeSingle()
      if (!taken) break
      slug = `${base}-${n}`
    }

    const password = body.owner_password ?? generatePassword()
    const internalEmail = `${slug}@gastro.pistazz.io`
    const ownerName = body.owner_name?.trim() || name

    // Geokodierung parallel zur Kontoanlage
    const geoPromise = geocodeRestaurant({ name, city, address, zip })

    // 1) Inhaber-Konto
    const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: ownerName },
    })
    if (createUserError || !newUser?.user) {
      return NextResponse.json({ error: createUserError?.message ?? 'Konto konnte nicht angelegt werden' }, { status: 500 })
    }
    const ownerId = newUser.user.id

    const rollback = async () => { await admin.auth.admin.deleteUser(ownerId).catch(() => {}) }

    // 2) Profil
    const { error: profileError } = await admin.from('profiles').upsert({
      id: ownerId,
      email: internalEmail,
      full_name: ownerName,
      role: 'restaurant_owner',
      onboarding_completed: true,
    })
    if (profileError) { await rollback(); return NextResponse.json({ error: profileError.message }, { status: 500 }) }

    // 3) Restaurant
    const geo = await geoPromise
    const publish = body.publish ?? true
    const { data: restaurant, error: restaurantError } = await admin.from('restaurants').insert({
      name,
      slug,
      type: body.type ?? 'restaurant',
      city,
      address: address ?? null,
      zip: zip ?? null,
      phone: phone ?? geo?.phone ?? null,
      email: email || null,
      website: website ?? geo?.website ?? null,
      instagram_handle: body.instagram_handle?.replace(/^@+/, '') || null,
      description: body.description || null,
      primary_color: body.primary_color ?? '#8BB06A',
      points_per_story: body.points_per_story ?? 500,
      owner_id: ownerId,
      is_active: publish,
      stamp_card_enabled: false,
      ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
      ...(geo?.place_id ? { google_place_id: geo.place_id } : {}),
      ...(geo?.rating ? { google_rating: geo.rating, google_review_count: geo.review_count ?? null } : {}),
    }).select('id, slug, name').single()

    if (restaurantError || !restaurant) {
      await rollback()
      return NextResponse.json({ error: restaurantError?.message ?? 'Restaurant konnte nicht angelegt werden' }, { status: 500 })
    }

    // 4) Profil ans Restaurant binden (Owner-RLS auf subscriptions)
    await admin.from('profiles').update({ restaurant_id: restaurant.id }).eq('id', ownerId)

    // 5) Testphase
    const trialDays = body.trial_days ?? TRIAL_DAYS
    let trialStarted = false
    if (trialDays > 0) {
      try {
        await startTrial(admin, restaurant.id, { plan: isPlanKey(body.plan) ? body.plan : DEFAULT_PLAN, days: trialDays })
        trialStarted = true
      } catch (e) { console.error('startTrial failed:', e) }
    }

    // 6) Magic-Link fuer den ersten Login ohne Passwort
    let magicLink: string | null = null
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://gastro.pistazz.io'
      const { data: link } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: internalEmail,
        options: { redirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
      })
      magicLink = link?.properties?.action_link ?? null
    } catch { /* optional */ }

    // 7) Lead markieren (nicht fatal)
    if (body.lead_id) {
      await admin.from('leads').update({ status: 'abgeschlossen', updated_at: new Date().toISOString() }).eq('id', body.lead_id).then(() => {}, () => {})
    }

    await afterRestaurantChange({ id: restaurant.id, slug: restaurant.slug })

    return NextResponse.json({
      ok: true,
      restaurant_id: restaurant.id,
      slug: restaurant.slug,
      login_name: restaurant.slug,
      login_url: 'https://gastro.pistazz.io/restaurant-login',
      password,
      magic_link: magicLink,
      geocoded: !!geo,
      geo_source: geo?.source ?? null,
      trial_started: trialStarted,
      published: publish,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
