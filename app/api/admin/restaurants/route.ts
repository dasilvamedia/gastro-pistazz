import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const filterStatus = searchParams.get('status') ?? 'all'
  const filterCity   = searchParams.get('city')   ?? ''

  let query = admin
    .from('restaurants')
    .select('id, slug, name, type, city, total_stories, total_customers, is_active, is_verified, owner:profiles!owner_id(full_name)')
    .order('created_at', { ascending: false })

  if (filterStatus === 'active')   query = query.eq('is_active', true)
  if (filterStatus === 'inactive') query = query.eq('is_active', false)
  if (filterCity)                  query = query.eq('city', filterCity)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ restaurants: data ?? [] })
}
