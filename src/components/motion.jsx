import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

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
export function Counter({ value, format = (n) => n.toFixed(2), className = '', duration = 750 }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const raf = useRef(null)

  useEffect(() => {
    if (reduced || from.current === value) { setShown(value); from.current = value; return }
    const start = performance.now()
    const a = from.current
    const b = value
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      // Ease out — fast at first, gently settling, like the springs elsewhere.
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(a + (b - a) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else from.current = b
    }
    raf.current = requestAnimationFrame(tick)
    return () => raf.current && cancelAnimationFrame(raf.current)
  }, [value, reduced, duration])

  return <span className={`tnum ${className}`}>{format(shown)}</span>
}

// A bottom sheet you can actually throw away with your thumb. Dragging down
// past a threshold — or flicking, regardless of distance — dismisses it.
export function Sheet({ open, onClose, children, className = '' }) {
  const reduced = useReducedMotion()

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

  return (
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
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose()
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" />
          <div className="mx-auto max-w-md">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresenceShim>
  )
}

// Kept local so callers never have to reach for AnimatePresence themselves and
// risk forgetting it — without one, sheets vanish instead of leaving.
function AnimatePresenceShim({ show, children }) {
  return <AnimatePresence initial={false}>{show ? children : null}</AnimatePresence>
}

export { motion, AnimatePresence }
