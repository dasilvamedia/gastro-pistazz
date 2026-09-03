import { createAdminClient } from '@/lib/supabase/admin'
import { sendToUsers, type PushPayload } from '@/lib/push/server'

// Eine Benachrichtigung = Zeile in der In-App-Inbox (notifications) + Push.
// Jede Automatik (Story freigegeben, Deal eingeloest, Karte voll, Kampagne)
// laeuft hier durch, damit Inbox und Push nie auseinanderlaufen.

export interface NotifyInput {
  title: string
  body: string
  url?: string
  restaurant_id?: string | null
  image_url?: string | null
  push?: boolean
}

const CHUNK = 500

export async function notifyUsers(userIds: string[], input: NotifyInput): Promise<{ inbox: number; push: { web: number; ios: number; failed: number } }> {
  const ids = [...new Set(userIds)].filter(Boolean)
  if (ids.length === 0) return { inbox: 0, push: { web: 0, ios: 0, failed: 0 } }
  const admin = createAdminClient()
  let inbox = 0

  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK)
    const { error } = await admin.from('notifications').insert(part.map(user_id => ({
      user_id,
      restaurant_id: input.restaurant_id ?? null,
      channel: 'in_app',
      title: input.title,
      body: input.body,
      image_url: input.image_url ?? null,
      action_url: input.url ?? null,
    })))
    if (error) console.error('[notify] inbox insert failed:', error)
    else inbox += part.length
  }

  const payload: PushPayload = { title: input.title, body: input.body, url: input.url }
  const push = input.push === false ? { web: 0, ios: 0, failed: 0 } : await sendToUsers(ids, payload)
  return { inbox, push }
}

export async function notifyUser(userId: string, input: NotifyInput) {
  return notifyUsers([userId], input)
}

/** Inhaber eines Restaurants benachrichtigen (owner_id, Fallback profiles.restaurant_id) */
export async function notifyRestaurantOwner(restaurantId: string, input: NotifyInput) {
  const admin = createAdminClient()
  const { data: r } = await admin.from('restaurants').select('owner_id').eq('id', restaurantId).maybeSingle()
  let ownerId = r?.owner_id as string | null | undefined
  if (!ownerId) {
    const { data: p } = await admin.from('profiles').select('id').eq('restaurant_id', restaurantId).eq('role', 'restaurant_owner').maybeSingle()
    ownerId = p?.id
  }
  if (!ownerId) return null
  return notifyUsers([ownerId], { ...input, restaurant_id: restaurantId })
}
