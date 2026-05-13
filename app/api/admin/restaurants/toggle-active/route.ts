import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { restaurant_id, is_active } = await request.json()
    if (!restaurant_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'restaurant_id and is_active required' }, { status: 400 })
    }

    const { error } = await admin
      .from('restaurants')
      .update({ is_active })
      .eq('id', restaurant_id)

    if (error) throw error

    return NextResponse.json({ ok: true, is_active })
  } catch (err) {
    console.error('PATCH /api/admin/restaurants/toggle-active error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
