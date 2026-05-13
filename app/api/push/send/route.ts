import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:info@pistazz.io',
    pub,
    priv,
  )
  vapidConfigured = true
}

export async function POST(request: NextRequest) {
  try {
    ensureVapid()
    const { user_id, title, body, url } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title: title ?? '📸 pistazz',
      body:  body  ?? 'Deine Story wird geprüft.',
      url:   url   ?? '/home',
      tag:   'pistazz-story',
    })

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    )

    // Clean up expired subscriptions (410 Gone)
    const expired = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter(({ r }) => r.status === 'rejected' && (r as PromiseRejectedResult).reason?.statusCode === 410)
      .map(({ sub }) => sub.endpoint)

    if (expired.length) {
      await admin.from('push_subscriptions').delete().in('endpoint', expired)
    }

    const sent = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('POST /api/push/send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
