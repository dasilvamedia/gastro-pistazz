import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LIMITS, DEFAULT_PLAN, type PlanKey, type PlanLimits } from '@/lib/plans'

interface Subscription {
  plan: PlanKey
  status: string
}

export async function getRestaurantSubscription(restaurantId: string): Promise<Subscription | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('plan, status')
    .eq('restaurant_id', restaurantId)
    .single()
  return data ?? null
}

export async function getPlanLimits(restaurantId: string): Promise<PlanLimits> {
  const sub = await getRestaurantSubscription(restaurantId)
  // Ohne Abo-Zeile gilt das Einstiegspaket (gleicher Default wie im Client)
  if (!sub) return PLAN_LIMITS[DEFAULT_PLAN]
  return PLAN_LIMITS[sub.plan] ?? PLAN_LIMITS[DEFAULT_PLAN]
}

export async function checkActiveDealsLimit(
  restaurantId: string
): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const limits = await getPlanLimits(restaurantId)
  if (limits.max_active_deals === null) return { allowed: true, current: 0, max: null }

  const admin = createAdminClient()
  const { count } = await admin
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'active')

  const current = count ?? 0
  return { allowed: current < limits.max_active_deals, current, max: limits.max_active_deals }
}

export async function checkQrCodeLimit(
  restaurantId: string
): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const limits = await getPlanLimits(restaurantId)
  if (limits.max_qr_codes === null) return { allowed: true, current: 0, max: null }

  const admin = createAdminClient()
  const { count } = await admin
    .from('qr_codes')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)

  const current = count ?? 0
  return { allowed: current < limits.max_qr_codes, current, max: limits.max_qr_codes }
}
