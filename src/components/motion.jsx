import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion, useDragControls } from 'motion/react'

// One place for how motion feels, so every screen moves the same way.
//
// Springs rather than durations: a duration makes everything arrive on a
// schedule, which is what reads as "a website". Real interfaces overshoot a
// little and settle, and the eye notices even when the person doesn't.
export const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }
export const SOFT = { type: 'spring', stiffness: 240, damping: 30 }

// Screens enter as a whole and their children follow just behind, so a page
// reads as one thing arriving rather than a dozen unrelated pieces.
export function Screen({ children, className = '' }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SOFT, staggerChildren: reduced ? 0 : 0.045 }}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({ children, className = '', delay = 0 }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: reduced ? 0 : 0.05, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  )
}

export function Item({ children, className = '', ...rest }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: SPRING },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// Anything you can press. The scale is small on purpose — a button that shrinks
// dramatically feels like a toy, one that barely gives feels like a surface.
export function Tap({ children, className = '', as: As = motion.button, ...rest }) {
  return (
    <As className={className} whileTap={{ scale: 0.97 }} transition={SPRING} {...rest}>
      {children}
    </As>
  )
}

// A figure that counts to its value. Money that simply appears is a number;
// money that climbs is a result — and it draws the eye to the one thing on the
// screen that matters most.
//
// Given an `id`, the last value shown is remembered for the life of the tab. A
// screen's data always arrives after its first render, so without this the
// figure counts up from zero every single time you navigate back to it — which
// reads as a glitch, not as emphasis. With it, the count happens when the
// number genuinely changed: on first open, and after you log something.
const lastShown = new Map()

export function Counter({ id, value, ready = true, format = (n) => n.toFixed(2), className = '', duration = 750 }) {
  const reduced = useReducedMotion()
  const remembered = id != null && lastShown.has(id) ? lastShown.get(id) : null
  const [shown, setShown] = useState(remembered ?? value)
  const from = useRef(remembered ?? value)
  const raf = useRef(null)

  useEffect(() => {
    // A screen's data lands after its first render, so an unready value is a
    // placeholder, not a change. Animating to it would count the figure down to
    // zero and back every time you navigate here — a glitch, not emphasis.
    if (!ready) return

    if (id != null) lastShown.set(id, value)
    if (reduced || from.current === value) {
      setShown(value)
      from.current = value
      return
    }
    const t0 = performance.now()
    const a = from.current
    const b = value
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration)
      // Ease out — fast at first, gently settling, like the springs elsewhere.
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(a + (b - a) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else from.current = b
    }
    raf.current = requestAnimationFrame(tick)
    return () => raf.current && cancelAnimationFrame(raf.current)
  }, [value, ready, reduced, duration, id])

  return <span className={`tnum ${className}`}>{format(shown)}</span>
}

// A bottom sheet you can actually throw away with your thumb. Dragging down
// past a threshold — or flicking, regardless of distance — dismisses it.
export function Sheet({ open, onClose, children, className = '' }) {
  const reduced = useReducedMotion()
  // The drag gesture used to live on the same element that scrolls its own
  // content (Savings, Tax — anything taller than the sheet). Framer can't
  // tell "the thumb is scrolling the list" from "the thumb is dragging the
  // sheet down" on that element, so it would swallow taps near the top
  // (the back button) and never let a swipe-down reach the bottom of a
  // long page. Starting the drag only from the grab handle below removes
  // the ambiguity — the handle has nothing else to do with a touch.
  const controls = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Portalled to <body> — a caller nested inside a blurred or transformed
  // ancestor (TopBar's backdrop-blur header, say) would otherwise trap this
  // fixed-position sheet inside that ancestor's own small box instead of the
  // real viewport, on browsers that treat those properties as a containing
  // block. Every Sheet gets the same real-viewport guarantee, not just the
  // ones whose author happened to think about it.
  return createPortal(
    <AnimatePresenceShim show={open}>
      <motion.div
        className="fixed inset-0 z-50 flex items-end bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-4 pb-10 ${className}`}
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '100%' }}
          transition={SOFT}
          drag={reduced ? false : 'y'}
          dragListener={false}
          dragControls={controls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose()
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="mx-auto mb-3 h-1.5 w-10 shrink-0 touch-none rounded-full bg-slate-300"
            onPointerDown={(e) => !reduced && controls.start(e)}
          />
          <div className="mx-auto max-w-md">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresenceShim>,
    document.body
  )
}

// Kept local so callers never have to reach for AnimatePresence themselves and
// risk forgetting it — without one, sheets vanish instead of leaving.
function AnimatePresenceShim({ show, children }) {
  return <AnimatePresence initial={false}>{show ? children : null}</AnimatePresence>
}

export { motion, AnimatePresence }
