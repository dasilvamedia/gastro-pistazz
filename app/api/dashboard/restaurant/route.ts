import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use admin client to bypass RLS — always works regardless of policies
    const admin = createAdminClient()
    const { data: restaurant, error } = await admin
      .from('restaurants')
      .select('id, name, slug, city, primary_color, logo_url, is_active')
      .eq('owner_id', user.id)
      .single()

    if (error || !restaurant) {
      return NextResponse.json({ restaurant: null }, { status: 200 })
    }

    return NextResponse.json({ restaurant })
  } catch (err) {
    console.error('GET /api/dashboard/restaurant error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
