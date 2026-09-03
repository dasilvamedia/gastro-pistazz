'use client'

// Push auf dem Geraet einschalten. Nativ (iOS-App ab Build 20) ueber
// @capacitor/push-notifications, im Browser ueber Web-Push. Alles ist
// feature-detected, damit aeltere App-Builds ohne Plugin weiterlaufen.

type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
type PushPlugin = {
  checkPermissions: () => Promise<{ receive: PermissionState }>
  requestPermissions: () => Promise<{ receive: PermissionState }>
  register: () => Promise<void>
  addListener: (event: string, cb: (data: unknown) => void) => Promise<{ remove: () => void }> | { remove: () => void }
  removeAllListeners: () => Promise<void>
}

const ENABLED_KEY = 'pz_push_enabled'

function nativePlugin(): PushPlugin | null {
  if (typeof window === 'undefined') return null
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: { PushNotifications?: PushPlugin } } }).Capacitor
  if (!cap?.isNativePlatform?.()) return null
  return cap.Plugins?.PushNotifications ?? null
}

function platform(): 'ios' | 'android' {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  return cap?.getPlatform?.() === 'android' ? 'android' : 'ios'
}

export type PushStatus = 'unsupported' | 'prompt' | 'granted' | 'denied'

export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (nativePlugin()) return true
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushStatus(): Promise<PushStatus> {
  const native = nativePlugin()
  if (native) {
    try {
      const { receive } = await native.checkPermissions()
      return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt'
    } catch { return 'unsupported' }
  }
  if (!pushSupported()) return 'unsupported'
  const p = Notification.permission
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'
}

export function pushLocallyEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) === '1' } catch { return false }
}

let listenersBound = false
function bindNativeListeners(native: PushPlugin, onNavigate?: (url: string) => void, onReceived?: () => void) {
  if (listenersBound) return
  listenersBound = true
  native.addListener('registration', async (data) => {
    const token = (data as { value?: string })?.value
    if (!token) return
    await fetch('/api/push/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: platform() }),
    }).catch(() => {})
    try { localStorage.setItem(ENABLED_KEY, '1') } catch { /* egal */ }
  })
  native.addListener('registrationError', (err) => console.error('[push] registration error', err))
  native.addListener('pushNotificationReceived', () => { onReceived?.(); window.dispatchEvent(new CustomEvent('pz:push-received')) })
  native.addListener('pushNotificationActionPerformed', (data) => {
    const url = (data as { notification?: { data?: { url?: string } } })?.notification?.data?.url ?? '/benachrichtigungen'
    if (onNavigate) onNavigate(url)
    else window.location.href = url
  })
}

/** Muss aus einer Nutzer-Geste heraus aufgerufen werden (Button). */
export async function enablePush(opts: { onNavigate?: (url: string) => void } = {}): Promise<PushStatus> {
  const native = nativePlugin()
  if (native) {
    bindNativeListeners(native, opts.onNavigate)
    const { receive } = await native.requestPermissions()
    if (receive !== 'granted') return receive === 'denied' ? 'denied' : 'prompt'
    await native.register()
    return 'granted'
  }

  if (!pushSupported()) return 'unsupported'
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'prompt'
  const existing = await reg.pushManager.getSubscription()
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })
  const json = sub.toJSON()
  const p256dh = json.keys?.['p256dh'], auth = json.keys?.['auth']
  if (p256dh && auth) {
    await fetch('/api/push/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh, auth } }),
    })
  }
  try { localStorage.setItem(ENABLED_KEY, '1') } catch { /* egal */ }
  return 'granted'
}

export async function disablePush(): Promise<void> {
  try { localStorage.removeItem(ENABLED_KEY) } catch { /* egal */ }
  const native = nativePlugin()
  if (!native) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unregister', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        await sub.unsubscribe()
      }
      return
    } catch { return }
  }
  await fetch('/api/push/unregister', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => {})
}

/** Beim App-Start: Token still auffrischen, wenn Push schon erlaubt war. */
export async function silentReregister(onNavigate?: (url: string) => void): Promise<void> {
  const native = nativePlugin()
  if (!native) return
  try {
    bindNativeListeners(native, onNavigate)
    const { receive } = await native.checkPermissions()
    if (receive === 'granted' && pushLocallyEnabled()) await native.register()
  } catch { /* still */ }
}
