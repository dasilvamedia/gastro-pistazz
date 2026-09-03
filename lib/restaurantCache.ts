import { revalidatePath, revalidateTag } from 'next/cache'
import { broadcastLive } from '@/lib/liveBroadcast'

// Nach jeder Restaurant-Aenderung (Owner oder Admin): Next-Cache der
// betroffenen Seiten leeren und alle verbundenen Gaeste per Broadcast
// zum Nachladen anstossen.
export async function afterRestaurantChange(restaurant: { id: string; slug?: string | null }, previousSlug?: string | null) {
  try {
    revalidatePath(`/restaurant/${restaurant.id}`)
    if (restaurant.slug) revalidatePath(`/r/${restaurant.slug}`)
    if (previousSlug && previousSlug !== restaurant.slug) revalidatePath(`/r/${previousSlug}`)
    revalidatePath('/entdecken')
    revalidatePath('/home')
    revalidatePath('/deals')
    revalidateTag('restaurants', 'max')
  } catch {
    // Cache-Invalidierung darf einen erfolgreichen Save nie kaputt machen
  }
  await broadcastLive('restaurant_updated', { id: restaurant.id })
}
