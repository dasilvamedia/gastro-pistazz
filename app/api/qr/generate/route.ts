import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const generateSchema = z.object({
  label: z.string().min(1).max(100),
  target_url: z.string().url('Invalid target URL'),
})

function generateQRCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { label, target_url } = parsed.data
    const admin = createAdminClient()

    // Verify user is restaurant_owner
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'restaurant_owner') {
      return NextResponse.json({ error: 'Forbidden: restaurant owners only' }, { status: 403 })
    }

    // Get the owner's restaurant
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return NextResponse.json({ error: 'No restaurant found for this owner' }, { status: 404 })
    }

    const code = generateQRCode()

    const { data: qrCode, error: insertError } = await admin
      .from('qr_codes')
      .insert({
        restaurant_id: restaurant.id,
        code,
        label,
        target_url,
        scan_count: 0,
        is_active: true,
      })
      .select('id, code, target_url, label')
      .single()

    if (insertError) {
      console.error('QR code insert error:', insertError)
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
    }

    return NextResponse.json({
      qr_code_id: qrCode.id,
      code: qrCode.code,
      target_url: qrCode.target_url,
      label: qrCode.label,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/qr/generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
