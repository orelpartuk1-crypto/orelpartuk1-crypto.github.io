import { useEffect, useRef, useState } from 'react'
import { merchantDomain, merchantColor } from '../lib/merchants'

// Two independent sources, tried in order. Clearbit renders the nicest mark
// (proper logo, transparent, square-ish) but its free tier has been unstable;
// DuckDuckGo's icon service is the plainer, longer-lived backstop. Either
// way nothing but the shop's domain is sent, and only once per shop.
const SOURCES = [
  (d) => `https://logo.clearbit.com/${d}?size=128`,
  (d) => `https://icons.duckduckgo.com/ip3/${d}.ico`,
]

// Remembers, per tab, which source produced a real logo for a domain — or
// that none did. A shop with no logo anywhere is asked about once and then
// renders instantly from then on.
const resolved = new Map() // domain -> working source index, or -1 for none

// If a source hasn't answered in this long, stop waiting on it. Without a
// timeout a request that neither loads nor errors (offline, DNS black hole,
// a service quietly dropping traffic) leaves the row waiting forever.
const TIMEOUT_MS = 4000

// The shop's logo when there genuinely is one, and until then whatever the
// caller already shows for this kind of row — normally the category emoji on
// its tinted circle.
//
// The important detail: this renders the fallback *until a logo has actually
// loaded*, rather than painting an empty circle and hoping. The previous
// version showed a white `bg-white` container the moment it mounted, so a
// logo service that was unreachable or slow left a blank grey disc on screen
// — which is exactly what it looked like on device. Now the worst case is
// "you keep seeing the emoji", which is indistinguishable from not having
// asked at all.
export default function MerchantLogo({ name, size = 40, className = '', fallback = null }) {
  const domain = merchantDomain(name)
  const cached = domain ? resolved.get(domain) : undefined

  // -1 / undefined-with-no-domain => never try. A cached index => go straight
  // to the source already known to work.
  const [srcIndex, setSrcIndex] = useState(() => {
    if (!domain) return -1
    return cached === undefined ? 0 : cached
  })
  // Only true once an <img> has fired load. Starts true for a domain already
  // known good, so revisiting a screen doesn't flash the emoji again.
  const [loaded, setLoaded] = useState(() => domain != null && cached >= 0)
  const timer = useRef(null)

  const trying = srcIndex >= 0 && srcIndex < SOURCES.length

  // Give up on a source that neither loads nor errors.
  useEffect(() => {
    if (!trying || loaded) return
    timer.current = setTimeout(() => advance(), TIMEOUT_MS)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trying, loaded, srcIndex, domain])

  const advance = () => {
    const next = srcIndex + 1
    if (domain) resolved.set(domain, next >= SOURCES.length ? -1 : next)
    setSrcIndex(next)
  }

  const letter = String(name || '?').trim().charAt(0).toUpperCase() || '?'
  const box = { width: size, height: size }

  const fallbackNode =
    fallback ?? (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
        style={{ ...box, backgroundColor: merchantColor(name), fontSize: size * 0.42 }}
        aria-hidden="true"
      >
        {letter}
      </span>
    )

  if (!domain || (!trying && !loaded)) return fallbackNode

  return (
    <span className="relative shrink-0" style={box}>
      {/* Whatever the row would normally show, visible until a logo wins. */}
      {!loaded && fallbackNode}
      {trying && (
        <img
          key={srcIndex}
          src={SOURCES[srcIndex](domain)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`h-full w-full rounded-full bg-white object-contain ${loaded ? '' : 'absolute inset-0 opacity-0'} ${className}`}
          onLoad={() => {
            clearTimeout(timer.current)
            if (domain) resolved.set(domain, srcIndex)
            setLoaded(true)
          }}
          onError={() => {
            clearTimeout(timer.current)
            advance()
          }}
        />
      )}
    </span>
  )
}
