import { NextRequest, NextResponse } from 'next/server'
import { notifyUsers } from '@/lib/notifyUser'

// Interner Sende-Endpunkt (Server -> Server, x-internal-secret). Wird von
// Cron-Jobs oder externen Automationen genutzt; die App-Routen rufen
// lib/notifyUser direkt.
export async function POST(request: NextRequest) {
  const internalSecret = process.env.INTERNAL_NOTIFY_SECRET
  if (!internalSecret || request.headers.get('x-internal-secret') !== internalSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as {
    user_id?: string; user_ids?: string[]; title?: string; body?: string; url?: string; restaurant_id?: string
  }
  const ids = body.user_ids ?? (body.user_id ? [body.user_id] : [])
  if (ids.length === 0 || !body.title) return NextResponse.json({ error: 'user_id(s) und title erforderlich' }, { status: 400 })

  const result = await notifyUsers(ids, {
    title: body.title,
    body: body.body ?? '',
    url: body.url,
    restaurant_id: body.restaurant_id ?? null,
  })
  return NextResponse.json({ ok: true, ...result })
}
