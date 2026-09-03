/**
 * Sendet eine interne Benachrichtigung an info@pistazz.io.
 * Schlaegt still fehl, der Nutzer-Flow wird nie geblockt.
 *
 * Laeuft im Browser direkt nach der Registrierung. Die Route prueft die
 * Supabase-Session des Aufrufers (kein Shared Secret im Client-Bundle).
 */
export async function notifyNewUser(params: {
  email:  string
  name:   string | null
  method: string
}) {
  try {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gastro.pistazz.io')

    await fetch(`${base}/api/notify/new-user`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params),
    })
  } catch {
    // nie kritisch
  }
}
