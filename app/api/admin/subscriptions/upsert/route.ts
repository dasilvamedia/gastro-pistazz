import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS, type PlanKey } from '@/lib/plans'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'super_admin') return null
  return { userId: user.id, admin }
}

// PATCH /api/admin/subscriptions/upsert
// Used when no subscription row exists yet for a restaurant.
// Creates the row first, then applies the action.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await assertSuperAdmin()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { restaurant_id } = body
    if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

    const { admin, userId } = auth
    const now = new Date().toISOString()

    // Check for existing subscription
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .single()

    let subId: string

    if (existing?.id) {
      subId = existing.id
    } else {
      // Create a minimal subscription row
      const plan = (body.plan && PLANS[body.plan as PlanKey]) ? body.plan : 'professional'
      const { data: created, error: createErr } = await admin
        .from('subscriptions')
        .insert({
          restaurant_id,
          plan,
          status: 'trial',
          monthly_fee: PLANS[plan as PlanKey].price_monthly,
          setup_fee: PLANS[plan as PlanKey].setup_fee,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single()

      if (createErr || !created) throw createErr ?? new Error('Could not create subscription')
      subId = created.id
    }

    // Now delegate to the same logic as the PATCH [id] route
    const updates: Record<string, unknown> = { updated_at: now }

    if (body.plan && PLANS[body.plan as PlanKey]) {
      const plan = PLANS[body.plan as PlanKey]
      updates.plan = body.plan
      updates.monthly_fee = body.monthly_fee ?? plan.price_monthly
      updates.setup_fee   = body.setup_fee   ?? plan.setup_fee
      await admin.from('restaurants').update({ plan: body.plan }).eq('id', restaurant_id)
    }

    if (body.trial_duration_days !== undefined) {
      const days = Number(body.trial_duration_days)
      updates.trial_duration_days = days
      updates.status              = 'trial'
      updates.trial_started_at    = now
      updates.trial_ends_at       = new Date(Date.now() + days * 86400000).toISOString()
      updates.trial_ended_early   = false
      updates.trial_converted     = false
    }

    if (body.extend_trial_days) {
      const { data: current } = await admin
        .from('subscriptions')
        .select('trial_ends_at, trial_duration_days')
        .eq('id', subId)
        .single()
      const base = current?.trial_ends_at
        ? Math.max(Date.now(), new Date(current.trial_ends_at).getTime())
        : Date.now()
      updates.trial_ends_at       = new Date(base + body.extend_trial_days * 86400000).toISOString()
      updates.trial_duration_days = (current?.trial_duration_days ?? 0) + body.extend_trial_days
      updates.status              = 'trial'
      updates.trial_ended_early   = false
    }

    if (body.end_trial) {
      updates.trial_ended_early = true
      updates.trial_ended_by    = userId
      if (body.convert_to_paid) {
        updates.status              = 'active'
        updates.trial_converted     = true
        updates.trial_converted_at  = now
      } else {
        updates.status = 'expired'
      }
    }

    if (body.status && !body.end_trial && body.trial_duration_days === undefined) {
      updates.status = body.status
    }

    if (body.custom_note !== undefined) {
      updates.custom_note = body.custom_note
    }

    const { data, error } = await admin
      .from('subscriptions')
      .update(updates)
      .eq('id', subId)
      .select()
      .single()

    if (error) throw error

    // Notify owner
    if (body.notify_owner !== false) {
      const { data: owner } = await admin
        .from('profiles')
        .select('id')
        .eq('restaurant_id', restaurant_id)
        .eq('role', 'restaurant_owner')
        .single()

      if (owner) {
        let title = 'Account aktualisiert'
        let msg   = ''
        if (body.trial_duration_days) {
          title = 'Testphase gestartet! 🎉'
          msg   = `Du hast ${body.trial_duration_days} Tage alle Features kostenlos.`
        } else if (body.extend_trial_days) {
          title = 'Testphase verlängert ⏳'
          msg   = `Deine Testphase wurde um ${body.extend_trial_days} Tage verlängert.`
        } else if (body.end_trial && body.convert_to_paid) {
          title = 'Willkommen als Kunde! 💚'
          msg   = 'Dein Paket ist jetzt aktiv. Danke für dein Vertrauen!'
        } else if (body.end_trial) {
          title = 'Testphase beendet'
          msg   = 'Kontaktiere uns für ein Upgrade.'
        }
        if (title !== 'Account aktualisiert') {
          await admin.from('notifications').insert({
            user_id: owner.id,
            restaurant_id,
            title,
            body: msg,
          }).then(() => {}).catch(() => {})
        }
      }
    }

    return NextResponse.json({ ok: true, subscription: data })
  } catch (err) {
    console.error('PATCH /api/admin/subscriptions/upsert error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
