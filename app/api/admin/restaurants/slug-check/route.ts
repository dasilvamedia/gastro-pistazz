import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/lib/adminAuth'
import { SLUG_RE } from '@/lib/restaurantFields'

// Live-Pruefung im Admin-Editor / bei der Anlage: ist der Slug frei?
export async function GET(req: NextRequest) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim().toLowerCase()
  const exclude = req.nextUrl.searchParams.get('exclude')
  if (!SLUG_RE.test(slug) || slug.length < 2) {
    return NextResponse.json({ valid: false, available: false, reason: 'Nur Kleinbuchstaben, Zahlen und Bindestriche' })
  }
  let q = auth.admin.from('restaurants').select('id').eq('slug', slug)
  if (exclude) q = q.neq('id', exclude)
  const { data } = await q.maybeSingle()
  return NextResponse.json({ valid: true, available: !data, slug })
}
