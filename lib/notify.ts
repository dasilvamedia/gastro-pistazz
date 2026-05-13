/**
 * Sendet eine interne Benachrichtigung an info@pistazz.io.
 * Schlägt still fehl — der Nutzer-Flow wird nie geblockt.
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
      headers: {
        'Content-Type':      'application/json',
        'x-internal-secret': process.env.NEXT_PUBLIC_INTERNAL_NOTIFY_SECRET
                             ?? process.env.INTERNAL_NOTIFY_SECRET
                             ?? 'pistazz-internal',
      },
      body: JSON.stringify(params),
    })
  } catch {
    // nie kritisch
  }
}
