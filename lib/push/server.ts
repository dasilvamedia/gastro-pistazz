import webpush from 'web-push'
import { ApnsClient, Notification as ApnsNotification } from 'apns2'
import { createAdminClient } from '@/lib/supabase/admin'

// Push an Nutzer: Web-Push (Browser, push_subscriptions) und APNs (iOS-App,
// device_tokens). Beide Wege in einer Funktion, damit jeder Ausloeser
// (Story freigegeben, Karte voll, Kampagne) nur sendToUsers() ruft.
//
// Env fuer APNs: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8 (base64 der .p8),
// APNS_BUNDLE_ID, APNS_ENV (production|development). Fehlt etwas, wird iOS
// still uebersprungen und im Log vermerkt.

export interface PushPayload {
  title: string
  body: string
  url?: string
  badge?: number
  data?: Record<string, string>
  tag?: string
}

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:info@pistazz.io', pub, priv)
  vapidReady = true
  return true
}

let apns: ApnsClient | null | undefined
function getApns(): ApnsClient | null {
  if (apns !== undefined) return apns
  const keyId = process.env.APNS_KEY_ID
  const team = process.env.APNS_TEAM_ID
  const p8 = process.env.APNS_KEY_P8
  const topic = process.env.APNS_BUNDLE_ID ?? 'io.pistazz.gastro'
  if (!keyId || !team || !p8) {
    console.warn('[push] APNs nicht konfiguriert (APNS_KEY_ID / APNS_TEAM_ID / APNS_KEY_P8 fehlen)')
    apns = null
    return null
  }
  const signingKey = p8.includes('BEGIN PRIVATE KEY') ? p8 : Buffer.from(p8, 'base64').toString('utf8')
  apns = new ApnsClient({
    team,
    keyId,
    signingKey,
    defaultTopic: topic,
    host: process.env.APNS_ENV === 'development' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com',
  })
  return apns
}

const CHUNK = 500
const APNS_CONCURRENCY = 20

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function sendToUsers(userIds: string[], payload: PushPayload): Promise<{ web: number; ios: number; failed: number }> {
  const ids = [...new Set(userIds)].filter(Boolean)
  if (ids.length === 0) return { web: 0, ios: 0, failed: 0 }
  const admin = createAdminClient()
  let web = 0, ios = 0, failed = 0

  for (const part of chunks(ids, CHUNK)) {
    const [{ data: subs }, { data: tokens }] = await Promise.all([
      admin.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', part),
      admin.from('device_tokens').select('token, platform').in('user_id', part),
    ])

    // ── Web-Push ──
    if (subs && subs.length > 0 && ensureVapid()) {
      const body = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/benachrichtigungen', tag: payload.tag ?? 'pistazz' })
      const results = await Promise.allSettled(subs.map(s =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body)))
      const gone: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') web++
        else {
          failed++
          const code = (r.reason as { statusCode?: number } | undefined)?.statusCode
          if (code === 410 || code === 404) gone.push(subs[i].endpoint)
        }
      })
      if (gone.length) await admin.from('push_subscriptions').delete().in('endpoint', gone)
    }

    // ── APNs ──
    const iosTokens = (tokens ?? []).filter(t => t.platform === 'ios').map(t => t.token)
    const client = iosTokens.length > 0 ? getApns() : null
    if (client) {
      const dead: string[] = []
      for (const batch of chunks(iosTokens, APNS_CONCURRENCY)) {
        const results = await Promise.allSettled(batch.map(token =>
          client.send(new ApnsNotification(token, {
            alert: { title: payload.title, body: payload.body },
            sound: 'default',
            badge: payload.badge,
            data: { url: payload.url ?? '/benachrichtigungen', ...(payload.data ?? {}) },
            threadId: payload.tag,
          }))))
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') ios++
          else {
            failed++
            const reason = String((r.reason as { reason?: string } | undefined)?.reason ?? r.reason ?? '')
            if (/BadDeviceToken|Unregistered|DeviceTokenNotForTopic/i.test(reason)) dead.push(batch[i])
            else console.error('[push] APNs Fehler:', reason)
          }
        })
      }
      if (dead.length) await admin.from('device_tokens').delete().in('token', dead)
    }
  }

  return { web, ios, failed }
}

export function pushConfigured() {
  return {
    web: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    apns: !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_KEY_P8),
  }
}
