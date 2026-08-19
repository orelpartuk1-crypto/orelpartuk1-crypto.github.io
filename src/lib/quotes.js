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
//
// `funds` identifies a European mutual fund (Fondo de inversión) by ISIN
// instead of a ticker — Yahoo can't price an ISIN directly, so the function
// resolves it to an internal fund symbol first. Pass the ISIN's cached
// `yahoo_symbol` once you have one (see useHoldings' write-back) so that
// slower resolution step only happens the first time a fund is added, not on
// every refresh. Results land in the SAME cache/quotes map as tickers, keyed
// by ISIN instead of symbol — a holding is either a stock or a fund, never
// both, so the two id spaces never collide.
export async function fetchQuotes(tickers, { force = false, funds = [] } = {}) {
  const currency = getCurrency()
  const wanted = [...new Set((tickers || []).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean))]
  const wantedFunds = (funds || [])
    .map((f) => ({ isin: String(f.isin || '').trim().toUpperCase(), symbol: f.symbol || null }))
    .filter((f) => f.isin)
  if (!wanted.length && !wantedFunds.length) return {}

  const missing = wanted.filter((s) => !(s in cache.quotes))
  const missingFunds = wantedFunds.filter((f) => !(f.isin in cache.quotes))
  const stale = Date.now() - cache.at > FRESH_MS
  const currencyChanged = cache.currency !== currency
  if (!force && !stale && !missing.length && !missingFunds.length && !currencyChanged) return cache.quotes

  // A second caller while a fetch is in flight waits for that one rather than
  // starting its own — Wealth and Home both ask on the same render.
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('quotes', {
        body: { tickers: wanted, funds: wantedFunds, currency },
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

// What a holding is worth right now. Only a holding that names an identifier
// (ticker for a stock/ETF, ISIN for a fund) AND a number of units can be
// priced; everything else keeps the value you typed, which is the right
// answer for a flat, a car, or anything with no market to check against.
export function holdingValue(holding, quotes = cache.quotes) {
  const units = Number(holding?.units)
  const id = holding?.asset_type === 'fund' ? holding?.isin : holding?.ticker
  const q = id ? quotes[String(id).toUpperCase()] : null
  if (!q?.price || !Number.isFinite(units) || units <= 0) return Number(holding?.value || 0)
  return units * q.price
}

export function isTracked(holding) {
  const id = holding?.asset_type === 'fund' ? holding?.isin : holding?.ticker
  return !!id && Number(holding?.units) > 0
}

// Profit/loss against what you actually put in — null when there's nothing
// to compare (no cost basis recorded), not zero, since zero would claim
// "break-even" for a holding that simply never had its cost basis entered.
export function holdingPnl(holding, quotes = cache.quotes) {
  const basis = Number(holding?.cost_basis)
  if (!Number.isFinite(basis) || basis <= 0) return null
  const value = holdingValue(holding, quotes)
  return { amount: value - basis, pct: (value - basis) / basis }
}
