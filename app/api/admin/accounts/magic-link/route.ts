import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertSuperAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { userId: user.id }
}

// POST /api/admin/accounts/magic-link
// Generates a one-time login link for the restaurant owner (for sharing).
// Does NOT set any admin cookie — differs from impersonate which is for admin use.
export async function POST(request: NextRequest) {
  try {
    const check = await assertSuperAdmin()
    if (check instanceof NextResponse) return check

    const body = await request.json()
    const { user_id } = body
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(user_id)
    if (userErr || !userData?.user?.email) {
      return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gastro.pistazz.io'
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
      options: { redirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('magic-link generate error:', linkErr)
      return NextResponse.json({ error: 'Link konnte nicht generiert werden' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, link: linkData.properties.action_link })
  } catch (err) {
    console.error('POST /api/admin/accounts/magic-link error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
