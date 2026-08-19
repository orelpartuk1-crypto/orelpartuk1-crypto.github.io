// Live market prices for tracked holdings — stocks/ETFs by ticker, and
// European mutual funds (Fondos de inversión) by ISIN.
//
// This has to be a server function rather than a fetch from the phone: Yahoo
// sends no CORS headers, so a browser request is rejected before it starts.
// Routing through here also means one set of requests for the whole household
// instead of one per device.
//
// A fund's NAV isn't queryable by ISIN directly — Yahoo's chart endpoint only
// takes its own internal symbols. Resolving an ISIN to one first is a search
// call (slower, less reliable than the price lookup itself), so it only
// happens when the caller doesn't already have a cached symbol from a
// previous resolution — verified empirically against three real Vanguard
// fund ISINs before relying on it: search resolves e.g. IE0032620787 to
// "0P00000G12.F", and the SAME chart endpoint already used for tickers
// returns a real NAV (79.94 EUR, instrumentType MUTUALFUND) for that symbol.
//
// POST { tickers: ["VUAA.L"], funds: [{isin, symbol?}], currency: "EUR" }
//   -> { quotes: {
//          "VUAA.L": { price, currency, raw, rawCurrency, rate },
//          "IE0032620787": { price, currency, raw, rawCurrency, rate, symbol },
//        } }
// A fund entry always carries `symbol` back, resolved or not — the caller
// persists it so the next refresh skips the search step entirely.
import { corsHeaders } from '../_shared/cors.ts'

const CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/'
const SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search?q='
// Yahoo returns 401/429 to requests without a browser-shaped User-Agent.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

type Meta = { regularMarketPrice?: number; currency?: string }

async function meta(symbol: string): Promise<Meta | null> {
  try {
    const res = await fetch(`${CHART}${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.chart?.result?.[0]?.meta ?? null
  } catch {
    return null
  }
}

// ISIN -> Yahoo's internal fund symbol (e.g. "0P00000G12.F"). Prefers a
// result Yahoo itself tags as a fund/ETF over an unrelated hit that merely
// mentions the ISIN somewhere.
async function resolveIsin(isin: string): Promise<string | null> {
  try {
    const res = await fetch(`${SEARCH}${encodeURIComponent(isin)}`, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const json = await res.json()
    const quotes: any[] = json?.quotes ?? []
    const hit = quotes.find((q) => q.quoteType === 'MUTUALFUND' || q.quoteType === 'ETF') ?? quotes[0]
    return hit?.symbol ?? null
  } catch {
    return null
  }
}

// Exchange rate via Yahoo's own FX pairs, so the price and the rate come from
// one source and can't disagree about the day.
const rates = new Map<string, number>()
async function rateTo(from: string, to: string): Promise<number | null> {
  if (from === to) return 1
  const key = `${from}${to}`
  if (rates.has(key)) return rates.get(key)!
  const m = await meta(`${from}${to}=X`)
  const r = m?.regularMarketPrice
  if (typeof r !== 'number' || !isFinite(r) || r <= 0) return null
  rates.set(key, r)
  return r
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  let tickers: string[] = []
  let funds: { isin: string; symbol?: string | null }[] = []
  let currency = 'EUR'
  try {
    const body = await req.json()
    tickers = Array.isArray(body?.tickers) ? body.tickers : []
    funds = Array.isArray(body?.funds) ? body.funds : []
    if (typeof body?.currency === 'string') currency = body.currency.toUpperCase()
  } catch {
    return json({ error: 'Expected JSON { tickers, funds, currency }' }, 400)
  }

  // Deduped, trimmed, and capped — a portfolio of 40 lines is already
  // generous, and the cap keeps one bad caller from turning into 500
  // outbound requests.
  const symbols = [...new Set(tickers.map((s) => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 40)
  const fundList = funds
    .map((f) => ({ isin: String(f.isin || '').trim().toUpperCase(), symbol: f.symbol ? String(f.symbol).trim() : null }))
    .filter((f) => f.isin)
    .slice(0, 40)
  if (!symbols.length && !fundList.length) return json({ quotes: {} })

  // Shared by both the ticker and fund paths. `m.currency` is passed through
  // in its ORIGINAL case on purpose — Yahoo marks minor-unit (pence) lines
  // with a lowercase "GBp"/"GBX", distinct from major-unit "GBP". Collapsing
  // both to uppercase before checking (an earlier version of this did) would
  // divide an already-correct GBP price by 100 by mistake — a real bug this
  // was caught and fixed before it shipped, not a hypothetical.
  const quote = async (raw: number, exactCurrency: string) => {
    const rawCurrency = exactCurrency.toUpperCase()
    const isMinor = exactCurrency === 'GBp' || exactCurrency === 'GBX'
    const major = isMinor ? raw / 100 : raw
    const rate = await rateTo(rawCurrency, currency)
    if (rate == null) return null
    return { price: Math.round(major * rate * 10000) / 10000, currency, raw: major, rawCurrency, rate }
  }

  const out: Record<string, unknown> = {}

  await Promise.all(
    symbols.map(async (symbol) => {
      const m = await meta(symbol)
      const raw = m?.regularMarketPrice
      // An unknown ticker comes back without a price. Say nothing about it
      // rather than inventing a zero, which would read as "your ETF is
      // worthless" on the screen that shows your net worth.
      if (typeof raw !== 'number' || !isFinite(raw) || !m?.currency) return
      const q = await quote(raw, m.currency)
      if (q) out[symbol] = q
    })
  )

  await Promise.all(
    fundList.map(async (f) => {
      const symbol = f.symbol || (await resolveIsin(f.isin))
      // `symbol` always comes back, resolved or not, so the caller can tell
      // "still unknown" (null) apart from "known, just no price today" and
      // persist a successful resolution either way.
      if (!symbol) { out[f.isin] = { symbol: null }; return }
      const m = await meta(symbol)
      const raw = m?.regularMarketPrice
      if (typeof raw !== 'number' || !isFinite(raw) || !m?.currency) { out[f.isin] = { symbol }; return }
      const q = await quote(raw, m.currency)
      if (q) out[f.isin] = { ...q, symbol }
    })
  )

  return json({ quotes: out, at: new Date().toISOString() })
})
