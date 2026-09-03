import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/lib/adminAuth'
import { geocodeRestaurant } from '@/lib/geocode'
import { afterRestaurantChange } from '@/lib/restaurantCache'

// Koordinaten fuer EIN Restaurant neu bestimmen (Admin-Editor, Button
// "Neu geocodieren"). Ersetzt den Tabellen-Bulk-Job fuer den Einzelfall.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { data: r } = await auth.admin.from('restaurants').select('id, slug, name, city, address, zip').eq('id', id).single()
  if (!r) return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 })
  if (!r.city) return NextResponse.json({ error: 'Ohne Stadt keine Geokodierung' }, { status: 400 })

  const geo = await geocodeRestaurant({ name: r.name, city: r.city, address: r.address, zip: r.zip })
  if (!geo) return NextResponse.json({ error: 'Keine Koordinaten gefunden. Adresse pruefen.' }, { status: 404 })

  const update: Record<string, unknown> = { latitude: geo.lat, longitude: geo.lng }
  if (geo.place_id) update.google_place_id = geo.place_id
  const { error } = await auth.admin.from('restaurants').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await afterRestaurantChange({ id, slug: r.slug })
  return NextResponse.json({ ok: true, latitude: geo.lat, longitude: geo.lng, source: geo.source, place_id: geo.place_id ?? null })
}
