import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notifyUser'

const TYPE_LABEL: Record<string, string> = {
  instagram_story: 'Story', instagram_reel: 'Reel', instagram_post: 'Post', google_review: 'Google-Bewertung', receipt: 'Kassenbon',
}

const verifySchema = z.object({
  submission_id: z.string().uuid('Invalid submission_id'),
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { submission_id, action, rejection_reason } = parsed.data

    const admin = createAdminClient()

    // Get the user profile to check role
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // super_admin ist die echte Plattform-Rolle (Migration 002); 'admin' bleibt
    // aus Kompatibilitaet erlaubt. Ownership wird nur fuer Inhaber geprueft.
    const ALLOWED_ROLES = ['restaurant_owner', 'admin', 'super_admin']
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the submission
    const { data: submission, error: submissionError } = await admin
      .from('story_submissions')
      .select('id, restaurant_id, status')
      .eq('id', submission_id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Submission has already been processed' },
        { status: 409 }
      )
    }

    // Verify restaurant ownership if not admin
    if (profile.role === 'restaurant_owner') {
      const { data: restaurant, error: restaurantError } = await admin
        .from('restaurants')
        .select('id')
        .eq('id', submission.restaurant_id)
        .eq('owner_id', user.id)
        .single()

      if (restaurantError || !restaurant) {
        return NextResponse.json(
          { error: 'Forbidden: submission does not belong to your restaurant' },
          { status: 403 }
        )
      }
    }

    const updateData: Record<string, unknown> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    }

    if (action === 'reject' && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { error: updateError } = await admin
      .from('story_submissions')
      .update(updateData)
      .eq('id', submission_id)

    if (updateError) {
      console.error('Story verify update error:', updateError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }

    // Gast benachrichtigen (Inbox + Push). Punkte kommen aus dem DB-Trigger,
    // deshalb die Zeile nach dem Update noch einmal lesen.
    try {
      const { data: after } = await admin
        .from('story_submissions')
        .select('user_id, type, points_awarded, restaurant:restaurants(name)')
        .eq('id', submission_id)
        .single()
      if (after) {
        const rest = after.restaurant as unknown as { name: string } | null
        const label = TYPE_LABEL[after.type as string] ?? 'Beitrag'
        if (action === 'approve') {
          await notifyUser(after.user_id, {
            title: `${label} freigegeben: +${after.points_awarded ?? 0} Punkte`,
            body: `${rest?.name ?? 'Das Restaurant'} hat deinen Beitrag geprueft. Die Punkte sind auf deinem Konto.`,
            url: '/profil/punkte',
            restaurant_id: submission.restaurant_id,
          })
        } else {
          await notifyUser(after.user_id, {
            title: `${label} nicht freigegeben`,
            body: rejection_reason ? `Grund: ${rejection_reason}` : `${rest?.name ?? 'Das Restaurant'} konnte deinen Beitrag nicht bestaetigen. Du kannst es erneut versuchen.`,
            url: '/home',
            restaurant_id: submission.restaurant_id,
          })
        }
      }
    } catch (e) {
      console.error('verify notify failed:', e)
    }

    return NextResponse.json({ success: true, action, submission_id })
  } catch (err) {
    console.error('POST /api/stories/verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
