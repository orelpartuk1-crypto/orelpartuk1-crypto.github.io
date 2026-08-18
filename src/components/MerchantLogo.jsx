import { useState } from 'react'
import { merchantDomain, merchantColor } from '../lib/merchants'

// Two independent sources, tried in order. Clearbit renders the nicest mark
// (proper logo, transparent, square-ish) but its free tier has been unstable,
// and I could not reach it to confirm from where this was written — so a dead
// Clearbit must degrade to something real rather than silently turning every
// shop into a letter. DuckDuckGo's icon service is the backstop: plainer
// favicons, but long-lived and free. Either way nothing but the domain is
// sent, and only the domain.
// ?size= matters: Clearbit's default is small and looked soft blown up to
// row height, so ask for well above what we render and let the browser scale
// it down. DuckDuckGo's is a fixed favicon, hence the ordering.
const SOURCES = [
  (d) => `https://logo.clearbit.com/${d}?size=128`,
  (d) => `https://icons.duckduckgo.com/ip3/${d}.ico`,
]

// Remembers, for the life of the tab, which source finally worked for a
// domain — or that none did. A shop with no logo anywhere is asked about
// once and then never again, so the badge appears instantly on every later
// expense from it instead of re-running failed requests each time.
const resolved = new Map() // domain -> source index that worked, or -1 for none

// The shop's logo when there is one, and otherwise whatever the caller
// already shows for this kind of expense — the category emoji on its tinted
// circle — rather than a lettered badge, which just added a third visual
// language to rows that already had one. Nothing about the expense itself
// (amount, date, category) is ever part of the request; the only thing that
// leaves the device is the shop's domain, once per shop.
export default function MerchantLogo({ name, size = 40, className = '', fallback = null }) {
  const domain = merchantDomain(name)
  // Start at whichever source is already known to work for this shop, so a
  // second Mercadona expense doesn't repeat the first one's failed attempt.
  const [srcIndex, setSrcIndex] = useState(() => {
    if (!domain) return -1
    const seen = resolved.get(domain)
    return seen === undefined ? 0 : seen
  })

  const letter = String(name || '?').trim().charAt(0).toUpperCase() || '?'
  const box = { width: size, height: size }
  const failed = srcIndex < 0 || srcIndex >= SOURCES.length

  if (!domain || failed) {
    if (fallback) return fallback
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
        style={{ ...box, backgroundColor: merchantColor(name), fontSize: size * 0.42 }}
        aria-hidden="true"
      >
        {letter}
      </span>
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ${className}`}
      style={box}
    >
      <img
        key={srcIndex}
        src={SOURCES[srcIndex](domain)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
        onLoad={() => resolved.set(domain, srcIndex)}
        onError={() => {
          // Fall through to the next source; past the last one, the badge.
          const next = srcIndex + 1
          resolved.set(domain, next >= SOURCES.length ? -1 : next)
          setSrcIndex(next)
        }}
      />
    </span>
  )
}
