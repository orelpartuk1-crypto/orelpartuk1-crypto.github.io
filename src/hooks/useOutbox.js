import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { count, flush } from '../lib/outbox'

// How many writes are waiting, and pushing them the moment there's a
// connection again.
//
// `online` comes from the browser's own event, which is honest about the
// radio but not about whether the internet actually works (captive wifi,
// dead DNS). That's fine here: flush() simply fails and keeps the queue, so
// a false "online" costs one failed attempt, not data.
export function useOutbox() {
  const [waiting, setWaiting] = useState(0)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  const refresh = useCallback(async () => {
    try { setWaiting(await count()) } catch { /* IndexedDB unavailable */ }
  }, [])

  const push = useCallback(async () => {
    try {
      const sent = await flush(supabase)
      await refresh()
      return sent
    } catch {
      return 0
    }
  }, [refresh])

  useEffect(() => {
    refresh()
    const goOnline = () => { setOnline(true); push() }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    // Also on load and whenever the app comes back to the foreground: a phone
    // that regains signal while the tab is backgrounded may never fire
    // 'online' where we can hear it.
    const onVisible = () => { if (document.visibilityState === 'visible' && navigator.onLine) push() }
    document.addEventListener('visibilitychange', onVisible)
    if (navigator.onLine) push()
    // Anything queued by another part of the app should update the count.
    const onQueued = () => refresh()
    window.addEventListener('outbox-changed', onQueued)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('outbox-changed', onQueued)
    }
  }, [push, refresh])

  return { waiting, online, push, refresh }
}
