import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initTheme } from './lib/theme'

// Before first paint, so the app never flashes light then snaps to dark.
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register the service worker in production so the app installs + works offline.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })

  // The moment a new service worker takes control — which happens as soon as
  // a fresh deploy's SW finishes installing, since sw.js calls skipWaiting()
  // — reload right away. Without this, a tab that's still open (or a PWA
  // that was only backgrounded, not actually force-quit in time) keeps
  // running whatever JS it already loaded; "a new version was deployed" and
  // "the open app is running it" were two different things that only lined
  // up if force-quit happened at exactly the right moment. Now the page
  // updates itself.
  let refreshed = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshed) return
    refreshed = true
    window.location.reload()
  })
}
