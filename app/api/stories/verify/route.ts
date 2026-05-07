import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    if (profile.role !== 'restaurant_owner' && profile.role !== 'admin') {
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

    return NextResponse.json({ success: true, action, submission_id })
  } catch (err) {
    console.error('POST /api/stories/verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
