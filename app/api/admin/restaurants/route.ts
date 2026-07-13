import { NextRequest, NextResponse } from 'next/server'
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
    .select('id, slug, name, type, city, total_stories, total_customers, is_active, is_verified, owner_id, owner:profiles!owner_id(full_name)')
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

export async function PATCH(request: NextRequest) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, is_active } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await auth.admin
    .from('restaurants')
    .update({ is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
