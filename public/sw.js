// pistazz.io — Service Worker v1
// Handles Web Push Notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() }
  catch { payload = { title: '📸 pistazz', body: event.data.text(), url: '/' } }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? '📸 pistazz', {
      body:    payload.body   ?? '',
      icon:    '/icon-192.png',
      badge:   '/icon-72.png',
      tag:     payload.tag    ?? 'pistazz-story',
      renotify: true,
      data:    { url: payload.url ?? '/home' },
      actions: [{ action: 'open', title: 'App öffnen' }],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus().then(c => c.navigate(url))
      return self.clients.openWindow(url)
    })
  )
})
