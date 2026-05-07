import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertSuperAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { userId: user.id }
}

export async function POST(request: NextRequest) {
  try {
    const check = await assertSuperAdmin()
    if (check instanceof NextResponse) return check

    const body = await request.json()
    const { target_user_id } = body

    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get target user info
    const { data: targetUserData, error: userErr } = await admin.auth.admin.getUserById(target_user_id)
    if (userErr || !targetUserData?.user) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }
    const targetUser = targetUserData.user
    const targetEmail = targetUser.email
    if (!targetEmail) {
      return NextResponse.json({ error: 'Target user has no email' }, { status: 400 })
    }

    // Get restaurant name for the banner
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('name')
      .eq('owner_id', target_user_id)
      .single()

    const restaurantName = restaurant?.name ?? targetEmail

    // Generate magic link — redirect to /auth/callback so role check fires
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gastro.pistazz.io'
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
      options: { redirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Failed to generate magic link:', linkErr)
      return NextResponse.json({ error: 'Failed to generate impersonation link' }, { status: 500 })
    }

    // Set impersonation cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_impersonating', JSON.stringify({
      restaurant_name: restaurantName,
      target_user_id,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    })

    return NextResponse.json({
      ok: true,
      link: linkData.properties.action_link,
      restaurant_name: restaurantName,
    })
  } catch (err) {
    console.error('POST /api/admin/impersonate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('admin_impersonating')

    return NextResponse.json({ ok: true, redirect: '/admin/accounts' })
  } catch (err) {
    console.error('DELETE /api/admin/impersonate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
