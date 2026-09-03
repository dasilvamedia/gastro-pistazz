import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'super_admin') return null
  return { admin }
}

export async function GET() {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await auth.admin
    .from('restaurants')
    .select('id, slug, name, type, city, total_stories, total_customers, is_active, is_verified, owner_id, stamp_card_enabled, stamp_card_total, stamp_card_reward, owner:profiles!owner_id(full_name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const restaurants = (data ?? []).map((r: Record<string, unknown>) => {
    const ownerRaw = r.owner
    const ownerName = Array.isArray(ownerRaw)
      ? (ownerRaw[0] as { full_name: string | null } | undefined)?.full_name ?? null
      : (ownerRaw as { full_name: string | null } | null)?.full_name ?? null
    return { ...r, owner: undefined, owner_name: ownerName }
  })

  return NextResponse.json({ restaurants })
}

// Schnelle Schalter aus den Admin-Listen (Aktiv, Stempelkarte). Der volle
// Editor laeuft ueber /api/admin/restaurants/[id].
const patchSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
  stamp_card_enabled: z.boolean().optional(),
  stamp_card_total: z.number().int().min(1).max(20).optional(),
  stamp_card_reward: z.string().max(120).nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungueltige Eingabe', details: parsed.error.flatten() }, { status: 400 })
  }
  const { id, ...fields } = parsed.data
  const update = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nichts zu aendern' }, { status: 400 })
  }

  const { data, error } = await auth.admin
    .from('restaurants')
    .update(update)
    .eq('id', id)
    .select('id, is_active, stamp_card_enabled, stamp_card_total, stamp_card_reward')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, restaurant: data })
}
