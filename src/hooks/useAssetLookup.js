import { useEffect, useRef, useState } from 'react'
import { fetchQuotes } from '../lib/quotes'

// Debounced live-price lookup for one identifier — a ticker for a stock/ETF,
// an ISIN for a European mutual fund — shared by every "add/edit an asset"
// form (Wealth and the get-to-know flow both had their own copy of this
// exact debounce-then-fetch dance; one bug fixed in one now fixes it
// everywhere instead of needing to be remembered three times).
//
// `existingSymbol` is a fund's already-resolved yahoo_symbol, if there is
// one — passing it lets the server skip the slower ISIN search step on
// every keystroke re-lookup, not just on the very first save.
export function useAssetLookup(assetType, identifier, existingSymbol) {
  const [livePrice, setLivePrice] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const id = (identifier || '').trim().toUpperCase()
    clearTimeout(timer.current)
    if (!id) { setLivePrice(null); setLookingUp(false); return }
    setLookingUp(true)
    let alive = true
    timer.current = setTimeout(async () => {
      const q =
        assetType === 'fund'
          ? await fetchQuotes([], { funds: [{ isin: id, symbol: existingSymbol }] })
          : await fetchQuotes([id])
      if (!alive) return
      setLivePrice(q[id] || null)
      setLookingUp(false)
    }, 500)
    return () => { alive = false; clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType, identifier])

  return { livePrice, lookingUp }
}
