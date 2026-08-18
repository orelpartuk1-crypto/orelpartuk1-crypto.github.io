import { useEffect, useState } from 'react'

// iOS Safari — especially installed as a home-screen PWA — resizes the
// *visual* viewport when the on-screen keyboard opens or the browser chrome
// collapses, but `position: fixed` stays anchored to the *layout* viewport,
// which doesn't change. The gap between the two is exactly the bit of screen
// a fixed bottom bar (the nav, a Save button) ends up hidden behind or
// floating above instead of sitting at the real visible edge. This tracks
// that gap in pixels so a fixed element can shift up to compensate.
// A real keyboard eats well over 100px — often 250-350px. Anything smaller
// is just the visual viewport's `offsetTop` wobbling during ordinary scroll
// momentum, which fires the exact same 'resize'/'scroll' events. Reacting to
// that noise (the original threshold here was >1px) is what made the bottom
// nav detach from the bottom edge and float mid-page while scrolling —
// nothing to do with the keyboard at all.
const KEYBOARD_MIN_PX = 120

export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop
      setInset(gap > KEYBOARD_MIN_PX ? gap : 0)
    }
    update()
    // 'resize' fires when the keyboard opens/closes. 'scroll' fires
    // continuously during ordinary page scrolling too — that was the actual
    // source of the false positives, not anything keyboard-related.
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])

  return inset
}
