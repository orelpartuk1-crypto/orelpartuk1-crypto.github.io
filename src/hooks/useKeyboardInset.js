import { useEffect, useState } from 'react'

// iOS Safari — especially installed as a home-screen PWA — resizes the
// *visual* viewport when the on-screen keyboard opens or the browser chrome
// collapses, but `position: fixed` stays anchored to the *layout* viewport,
// which doesn't change. The gap between the two is exactly the bit of screen
// a fixed bottom bar (the nav, a Save button) ends up hidden behind or
// floating above instead of sitting at the real visible edge. This tracks
// that gap in pixels so a fixed element can shift up to compensate.
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop
      setInset(gap > 1 ? gap : 0)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
