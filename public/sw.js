// Minimal service worker: makes the app installable + fast + offline-tolerant.
// It only caches our own files — Supabase API calls always go to the network.
const CACHE = 'duo-budget-v5'
const SHELL = ['/', '/index.html', '/icon.svg', '/apple-touch-icon.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Never intercept cross-origin (e.g. Supabase) requests.
  if (url.origin !== self.location.origin) return

  // For page navigations, try network then fall back to the cached app shell.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // For assets: serve from cache instantly, refresh in the background.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})

// Real push notification (sent by netlify/functions/send-reminders.mjs).
// Tapping it focuses an existing tab or opens a new one — this is what makes
// the notification actually open the app, unlike a plain Shortcuts alert.
self.addEventListener('push', (event) => {
  let data = { title: '💸 Duo Budget', body: 'Log today’s spending.', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch { /* keep default */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      for (const c of all) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.navigate(url).then(() => c.focus())
      }
      return clients.openWindow(url)
    })
  )
})
