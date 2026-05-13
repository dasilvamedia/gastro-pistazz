import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkQrCodeLimit } from '@/lib/planGate'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { restaurant_id, code, label, target_url } = await req.json()
    if (!restaurant_id || !code) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const admin = createAdminClient()

    // Verify ownership
    const { data: rest } = await admin
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .eq('owner_id', user.id)
      .single()

    if (!rest) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Enforce QR code limit
    const limitCheck = await checkQrCodeLimit(restaurant_id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Limit erreicht: Dein Starter-Plan erlaubt nur ${limitCheck.max} QR-Code (aktuell: ${limitCheck.current}). Upgrade auf Professional für unbegrenzte QR-Codes.` },
        { status: 403 }
      )
    }

    const { data, error } = await admin
      .from('qr_codes')
      .insert({ restaurant_id, code, label: label || null, target_url, is_active: true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ qrCode: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
