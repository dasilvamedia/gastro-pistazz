import type { SupabaseClient } from '@supabase/supabase-js'
import { PLANS, TRIAL_DAYS, DEFAULT_PLAN, type PlanKey } from '@/lib/plans'

// Testphase fuer ein Restaurant starten oder neu setzen. Legt die
// subscriptions-Zeile an, falls sie fehlt (neue Restaurants hatten vorher
// gar kein Abo und damit keinen Trial). Wird von der Restaurant-Anlage und
// vom Admin-Upsert genutzt, damit beide identisch rechnen.
export async function startTrial(
  admin: SupabaseClient,
  restaurantId: string,
  opts: { plan?: PlanKey; days?: number } = {},
) {
  const plan = opts.plan ?? DEFAULT_PLAN
  const days = opts.days ?? TRIAL_DAYS
  const now = new Date()
  const ends = new Date(now.getTime() + days * 86400000)
  const p = PLANS[plan]

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  const trialFields = {
    plan,
    status: 'trial' as const,
    trial_duration_days: days,
    trial_started_at: now.toISOString(),
    trial_ends_at: ends.toISOString(),
    trial_ended_early: false,
    trial_converted: false,
    updated_at: now.toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from('subscriptions')
      .update(trialFields)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await admin
    .from('subscriptions')
    .insert({
      restaurant_id: restaurantId,
      monthly_fee: p.price_monthly,
      setup_fee: p.setup_fee,
      created_at: now.toISOString(),
      ...trialFields,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
