import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

// Welches Restaurant sieht die aktuelle Session?
// - Inhaber: das Restaurant mit owner_id = user
// - Super-Admin: per `impersonate_restaurant_id`-Cookie ("Kundenansicht") oder
//   explizit per requestedId (Admin-Editor, NFC-Tags), sonst keins.
// Wird von allen Dashboard-/Admin-Routen genutzt, damit Ownership an einer
// Stelle entschieden wird.
export async function resolveRestaurant(userId: string, requestedId?: string | null) {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const role = profile?.role ?? null
  const isSuperAdmin = role === 'super_admin' || role === 'admin'

  if (isSuperAdmin && requestedId) {
    const { data: restaurant } = await admin
      .from('restaurants').select('*').eq('id', requestedId).single()
    return { restaurant, isSuperAdmin, role, impersonatedId: requestedId }
  }

  const cookieStore = await cookies()
  const impersonateCookie = cookieStore.get('impersonate_restaurant_id')?.value
  if (isSuperAdmin && impersonateCookie) {
    const { data: restaurant } = await admin
      .from('restaurants').select('*').eq('id', impersonateCookie).single()
    return { restaurant, isSuperAdmin, role, impersonatedId: impersonateCookie }
  }

  const { data: restaurant } = await admin
    .from('restaurants').select('*').eq('owner_id', userId).single()

  return { restaurant, isSuperAdmin, role, impersonatedId: null as string | null }
}
