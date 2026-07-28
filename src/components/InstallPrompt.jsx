import { useEffect, useState } from 'react'

const DISMISS_KEY = 'db_install_dismissed'

// Detect whether the app is already running as an installed PWA.
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// A dismissible bottom card that guides the user to install the app.
// - Android/Chrome: shows a one-tap "Install" button (native prompt).
// - iPhone/Safari: shows the Share -> Add to Home Screen instructions.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null) // Android beforeinstallprompt event
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return

    // Android / desktop Chrome: capture the install event.
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iPhone has no install event — show the manual guide instead.
    if (isIOS()) setShow(true)

    // Hide once installed.
    const onInstalled = () => setShow(false)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setShow(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 px-4">
      <div className="mx-auto max-w-md rounded-xl2 bg-white p-4 shadow-card border border-slate-100">
        <div className="flex items-start gap-3">
          <img src="/icon.svg" alt="" className="h-11 w-11 rounded-xl2" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Install Duo Budget</p>
            {isIOS() && !deferred ? (
              <p className="mt-0.5 text-sm text-muted">
                Tap <ShareIcon className="inline h-4 w-4 -mt-0.5 text-brand-500" /> <b>Share</b>,
                then <b>Add to Home Screen</b> — it opens full-screen like a normal app.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted">
                Add it to your home screen for a full-screen, offline app.
              </p>
            )}
          </div>
          <button onClick={dismiss} className="p-1 text-slate-400" aria-label="Dismiss">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {deferred && (
          <button onClick={install} className="btn-primary mt-3 w-full py-3 text-base">
            Install app
          </button>
        )}
      </div>
    </div>
  )
}

function ShareIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 15V3m0 0L8 7m4-4 4 4" />
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    </svg>
  )
}
