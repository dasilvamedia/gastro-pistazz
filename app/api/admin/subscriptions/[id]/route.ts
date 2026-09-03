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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertSuperAdmin()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { admin, userId } = auth
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updated_at: now }

    // ── Plan ändern ──────────────────────────────────────────────────────────
    if (body.plan && PLANS[body.plan as PlanKey]) {
      const plan = PLANS[body.plan as PlanKey]
      updates.plan = body.plan
      updates.monthly_fee = body.monthly_fee ?? plan.price_monthly
      updates.setup_fee   = body.setup_fee   ?? plan.setup_fee
    }

    // ── Trial setzen / neu starten ────────────────────────────────────────────
    if (body.trial_duration_days !== undefined) {
      const days = Number(body.trial_duration_days)
      updates.trial_duration_days = days
      updates.status              = 'trial'
      updates.trial_started_at    = now
      updates.trial_ends_at       = new Date(Date.now() + days * 86400000).toISOString()
      updates.trial_ended_early   = false
      updates.trial_converted     = false
    }

    // ── Trial verlängern ──────────────────────────────────────────────────────
    if (body.extend_trial_days) {
      const { data: current } = await admin
        .from('subscriptions')
        .select('trial_ends_at, trial_duration_days')
        .eq('id', id)
        .single()
      const base = current?.trial_ends_at
        ? Math.max(Date.now(), new Date(current.trial_ends_at).getTime())
        : Date.now()
      updates.trial_ends_at       = new Date(base + body.extend_trial_days * 86400000).toISOString()
      updates.trial_duration_days = (current?.trial_duration_days ?? 0) + body.extend_trial_days
      updates.status              = 'trial'
      updates.trial_ended_early   = false
    }

    // ── Trial sofort beenden ──────────────────────────────────────────────────
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

    // ── Status direkt setzen ──────────────────────────────────────────────────
    if (body.status && !body.end_trial && body.trial_duration_days === undefined) {
      updates.status = body.status
    }

    // ── Notiz ─────────────────────────────────────────────────────────────────
    if (body.custom_note !== undefined) {
      updates.custom_note = body.custom_note
    }

    const { data, error } = await admin
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // ── Owner-Notification ────────────────────────────────────────────────────
    if (body.notify_owner !== false && body.restaurant_id) {
      const { data: owner } = await admin
        .from('profiles')
        .select('id')
        .eq('restaurant_id', body.restaurant_id)
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
            restaurant_id: body.restaurant_id,
            title,
            body: msg,
          }).then(() => {}, () => {}) // non-blocking
        }
      }
    }

    return NextResponse.json({ ok: true, subscription: data })
  } catch (err) {
    console.error('PATCH /api/admin/subscriptions/[id] error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
