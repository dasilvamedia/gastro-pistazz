import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  token: z.string().min(16).max(512),
  platform: z.enum(['ios', 'android']),
  app_version: z.string().max(40).optional(),
})

// Natives Geraet meldet sein APNs-/FCM-Token an. Ein Token gehoert immer
// genau einem Nutzer (Geraet wechselt den Account -> Zeile wandert mit).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ungueltiges Token' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('device_tokens').upsert(
    { user_id: user.id, token: parsed.data.token, platform: parsed.data.platform, app_version: parsed.data.app_version ?? null, last_seen_at: new Date().toISOString() },
    { onConflict: 'token' },
  )
  if (error) {
    console.error('device_tokens upsert error:', error)
    return NextResponse.json({ error: 'Registrierung fehlgeschlagen' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
