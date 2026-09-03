// Ein Broadcast-Kanal fuer alle Gaeste ("app-live", plus Legacy
// "entdecken-live"). Der Server sendet bei Restaurant-/Deal-Aenderungen ein
// Event, die Clients laden gezielt nach. Ersetzt die ungefilterten
// postgres_changes-Abos, die bei jedem Owner-Klick jeden Gast neu laden liessen.
export type LiveEvent = 'restaurant_updated' | 'deal_updated'

export async function broadcastLive(event: LiveEvent, payload: Record<string, unknown> = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const topics = event === 'restaurant_updated' ? ['realtime:app-live', 'realtime:entdecken-live'] : ['realtime:app-live']
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ messages: topics.map(topic => ({ topic, event, payload })) }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // best effort
  }
}
