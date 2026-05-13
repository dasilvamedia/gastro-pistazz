import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, address, city')
    .or('latitude.is.null,longitude.is.null')
    .limit(20)

  let updated = 0, skipped = 0, errors = 0

  for (const r of restaurants ?? []) {
    const query = r.address
      ? `${r.address}, ${r.city}, Deutschland`
      : `${r.name}, ${r.city}, Deutschland`

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'gastro-pistazz/1.0 contact@pistazz.io' },
      })
      const json = await res.json() as { lat?: string; lon?: string }[]

      if (json.length > 0 && json[0].lat) {
        await admin.from('restaurants')
          .update({ latitude: parseFloat(json[0].lat!), longitude: parseFloat(json[0].lon!) })
          .eq('id', r.id)
        updated++
      } else {
        skipped++
      }
      await new Promise(resolve => setTimeout(resolve, 1100))
    } catch {
      errors++
    }
  }

  const remaining = ((await admin.from('restaurants').select('id', { count: 'exact', head: true }).or('latitude.is.null,longitude.is.null')).count ?? 0)

  return NextResponse.json({ updated, skipped, errors, remaining })
}
