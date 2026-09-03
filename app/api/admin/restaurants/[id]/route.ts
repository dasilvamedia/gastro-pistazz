import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/lib/adminAuth'
import { RESTAURANT_ALLOWED_CORE, RESTAURANT_ALLOWED_OPTIONAL, RESTAURANT_ADMIN_ONLY, SLUG_RE } from '@/lib/restaurantFields'
import { sanitizeTags, CUISINE_OPTIONS, DIETARY_OPTIONS, MAX_CUISINE } from '@/lib/restaurantTags'
import { afterRestaurantChange } from '@/lib/restaurantCache'

// Voller Admin-Editor fuer EIN Restaurant. Vorher konnte der Super-Admin nur
// is_active schalten; alles andere ging nur ueber den Umweg Kundenansicht.

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const [{ data: restaurant, error }, { data: subscription }, { count: tagCount }] = await Promise.all([
    auth.admin.from('restaurants').select('*').eq('id', id).single(),
    auth.admin.from('subscriptions').select('*').eq('restaurant_id', id).maybeSingle(),
    auth.admin.from('nfc_tags').select('id', { count: 'exact', head: true }).eq('restaurant_id', id),
  ])
  if (error || !restaurant) return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 })

  let owner: { id: string; full_name: string | null; email: string | null } | null = null
  if (restaurant.owner_id) {
    const { data } = await auth.admin.from('profiles').select('id, full_name, email').eq('id', restaurant.owner_id).maybeSingle()
    owner = data ?? null
  }

  return NextResponse.json({ restaurant, subscription, owner, nfc_tag_count: tagCount ?? 0 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Ungueltiger Body' }, { status: 400 })

  const { data: current } = await auth.admin.from('restaurants').select('id, slug, owner_id').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 })

  if ('cuisine' in body) body.cuisine = sanitizeTags(body.cuisine, CUISINE_OPTIONS, MAX_CUISINE)
  if ('dietary' in body) body.dietary = sanitizeTags(body.dietary, DIETARY_OPTIONS)

  // Slug: Format, Eindeutigkeit, und der Login des Inhabers haengt daran
  let slugChanged = false
  if ('slug' in body) {
    const slug = String(body.slug ?? '').trim().toLowerCase()
    if (!SLUG_RE.test(slug) || slug.length < 2) {
      return NextResponse.json({ error: 'Slug: nur Kleinbuchstaben, Zahlen und Bindestriche' }, { status: 400 })
    }
    if (slug !== current.slug) {
      const { data: taken } = await auth.admin.from('restaurants').select('id').eq('slug', slug).neq('id', id).maybeSingle()
      if (taken) return NextResponse.json({ error: 'Dieser Slug ist bereits vergeben' }, { status: 409 })
      body.slug = slug
      slugChanged = true
    } else {
      delete body.slug
    }
  }

  if ('latitude' in body && body.latitude !== null && (typeof body.latitude !== 'number' || Math.abs(body.latitude) > 90)) {
    return NextResponse.json({ error: 'Breitengrad ungueltig' }, { status: 400 })
  }
  if ('longitude' in body && body.longitude !== null && (typeof body.longitude !== 'number' || Math.abs(body.longitude) > 180)) {
    return NextResponse.json({ error: 'Laengengrad ungueltig' }, { status: 400 })
  }

  const allowed = new Set<string>([...RESTAURANT_ALLOWED_CORE, ...RESTAURANT_ALLOWED_OPTIONAL, ...RESTAURANT_ADMIN_ONLY])
  const build = (includeOptional: boolean) => {
    const p: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (!allowed.has(key)) continue
      if (!includeOptional && (RESTAURANT_ALLOWED_OPTIONAL as readonly string[]).includes(key)) continue
      p[key] = body[key]
    }
    return p
  }

  let payload = build(true)
  if (Object.keys(payload).length === 0) return NextResponse.json({ error: 'Nichts zu aendern' }, { status: 400 })

  let { data, error } = await auth.admin.from('restaurants').update(payload).eq('id', id).select().single()
  if (error?.message && RESTAURANT_ALLOWED_OPTIONAL.some(c => error!.message.includes(c))) {
    payload = build(false)
    const retry = await auth.admin.from('restaurants').update(payload).eq('id', id).select().single()
    data = retry.data
    error = retry.error
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Slug-Wechsel = neue Login-E-Mail des Inhabers
  if (slugChanged && current.owner_id) {
    const { error: authErr } = await auth.admin.auth.admin.updateUserById(current.owner_id, {
      email: `${body.slug}@gastro.pistazz.io`,
      email_confirm: true,
    })
    if (authErr) console.error('owner email update after slug change failed:', authErr)
  }

  await afterRestaurantChange({ id, slug: data.slug }, current.slug)
  return NextResponse.json({ restaurant: data })
}

// Loeschen nur mit Bestaetigung per Slug (?confirm=<slug>). Der Auth-User des
// Inhabers bleibt bestehen, alle abhaengigen Zeilen kaskadieren.
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { data: current } = await auth.admin.from('restaurants').select('id, slug').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 })
  if (req.nextUrl.searchParams.get('confirm') !== current.slug) {
    return NextResponse.json({ error: 'Bestaetigung fehlt (confirm=<slug>)' }, { status: 400 })
  }
  const { error } = await auth.admin.from('restaurants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await afterRestaurantChange({ id, slug: current.slug })
  return NextResponse.json({ ok: true })
}
