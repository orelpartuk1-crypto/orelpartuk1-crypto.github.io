import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// GitHub Pages serves static files only — it has no idea /add is a route this
// single-page app handles internally, so a DIRECT hit on any path but "/"
// returns its 404 page. Verified live: `curl /add` -> HTTP 404.
//
// That never showed up while using the app (React Router handles those
// navigations in-page, and the service worker answers from cache once it's
// running), but it breaks the moment something OUTSIDE the app opens a deep
// link — which is exactly what the Apple Pay shortcut does.
//
// The fix GitHub Pages expects: serve the same app shell as 404.html, so any
// unknown path still boots the app and lets the router take it from there.
const spaFallback = {
  name: 'spa-404-fallback',
  closeBundle() {
    const dist = resolve(__dirname, 'dist')
    copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback],
  server: {
    host: true,
    port: 5173,
    // Allow access through public dev tunnels (e.g. *.trycloudflare.com)
    allowedHosts: true,
  },
})
