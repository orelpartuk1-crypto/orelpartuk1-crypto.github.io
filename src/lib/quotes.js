// Live market prices, fetched through our own Edge Function.
//
// It cannot be fetched straight from the phone: Yahoo sends no CORS headers,
// so the browser rejects the response before any of this code runs. The
// function also converts into the currency you actually think in — VUAA is a
// European ETF quoted in USD, and showing that number unconverted would
// overstate a portfolio by about 16%.
import { supabase } from './supabase'
import { getCurrency } from './format'

const FRESH_MS = 15 * 60 * 1000
let cache = { at: 0, currency: null, quotes: {} }
let inflight = null

export function cachedQuotes() {
  return cache.quotes
}

// Markets move in minutes, not seconds, and a phone opening the app five times
// an hour should not fetch five times. Anything under 15 minutes old is reused.
export async function fetchQuotes(tickers, { force = false } = {}) {
  const currency = getCurrency()
  const wanted = [...new Set((tickers || []).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean))]
  if (!wanted.length) return {}

  const missing = wanted.filter((s) => !(s in cache.quotes))
  const stale = Date.now() - cache.at > FRESH_MS
  const currencyChanged = cache.currency !== currency
  if (!force && !stale && !missing.length && !currencyChanged) return cache.quotes

  // A second caller while a fetch is in flight waits for that one rather than
  // starting its own — Wealth and Home both ask on the same render.
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('quotes', {
        body: { tickers: wanted, currency },
      })
      if (error) throw error
      cache = { at: Date.now(), currency, quotes: { ...(currencyChanged ? {} : cache.quotes), ...(data?.quotes || {}) } }
      return cache.quotes
    } catch {
      // Offline, or the service is down. Whatever was priced last time is
      // still the best answer available — better than blanking the screen.
      return cache.quotes
    } finally {
      inflight = null
    }
  })()
  return inflight
}

// What a holding is worth right now. Only a holding that names both a ticker
// and a number of units can be priced; everything else keeps the value you
// typed, which is the right answer for a flat or a car.
export function holdingValue(holding, quotes = cache.quotes) {
  const units = Number(holding?.units)
  const q = holding?.ticker ? quotes[String(holding.ticker).toUpperCase()] : null
  if (!q || !Number.isFinite(units) || units <= 0) return Number(holding?.value || 0)
  return units * q.price
}

export function isTracked(holding) {
  return !!holding?.ticker && Number(holding?.units) > 0
}
