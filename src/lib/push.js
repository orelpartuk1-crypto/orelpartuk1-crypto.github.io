import { supabase } from './supabase'

// Public VAPID key — safe to ship in client code (it's the public half of the
// keypair; only the private half, held server-side, can actually sign pushes).
export const VAPID_PUBLIC_KEY =
  'BOjhVO09UIP3_EDr5n5SknSAQzeuJna3V8HSgpDrih0XIEPC2Da34JZfyxILU3haxrATpIpDqwrYwjgIvuZEuLM'

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

// Ask for notification permission, subscribe this device to push, and save
// the subscription so the server can send to it later.
export async function enablePush(userId) {
  if (!pushSupported()) throw new Error('Push isn’t supported on this browser/device.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notification permission was not granted.')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      owner: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return sub
}

// Unsubscribe this device and remove its row.
export async function disablePush() {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

export async function isPushEnabled() {
  if (!pushSupported()) return false
  const reg = await navigator.serviceWorker.ready
  return !!(await reg.pushManager.getSubscription())
}
