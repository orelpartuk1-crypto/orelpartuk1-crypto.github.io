import { useState } from 'react'
import { merchantDomain, merchantColor } from '../lib/merchants'

// Remembers, for the life of the tab, which domains actually returned a logo
// and which 404'd. A shop that has no logo is asked about once and then never
// again, so the badge appears instantly on every later expense from it
// instead of flashing through a failed request each time.
const known = new Map() // domain -> true (has logo) | false (doesn't)

// The shop's logo when there is one, a stable coloured initial when there
// isn't. Nothing about the expense itself — amount, date, category — is ever
// part of the request; the only thing that leaves the device is the shop's
// domain, and only the first time that shop is seen.
export default function MerchantLogo({ name, size = 40, className = '' }) {
  const domain = merchantDomain(name)
  const [failed, setFailed] = useState(() => (domain ? known.get(domain) === false : true))

  const letter = String(name || '?').trim().charAt(0).toUpperCase() || '?'
  const box = { width: size, height: size }

  if (!domain || failed) {
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
        src={`https://logo.clearbit.com/${domain}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
        onLoad={() => known.set(domain, true)}
        onError={() => {
          known.set(domain, false)
          setFailed(true)
        }}
      />
    </span>
  )
}
