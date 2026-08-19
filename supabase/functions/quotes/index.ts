// Live market prices for tracked holdings.
//
// This has to be a server function rather than a fetch from the phone: Yahoo
// sends no CORS headers, so a browser request is rejected before it starts.
// Routing through here also means one set of requests for the whole household
// instead of one per device.
//
// POST { tickers: ["VUAA.L", "BTC-EUR"], currency: "EUR" }
//   -> { quotes: { "VUAA.L": { price: 128.14, currency: "EUR",
//                              raw: 148.76, rawCurrency: "USD", rate: 0.8615 } } }
import { corsHeaders } from '../_shared/cors.ts'

const CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/'
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
  let currency = 'EUR'
  try {
    const body = await req.json()
    tickers = Array.isArray(body?.tickers) ? body.tickers : []
    if (typeof body?.currency === 'string') currency = body.currency.toUpperCase()
  } catch {
    return json({ error: 'Expected JSON { tickers, currency }' }, 400)
  }

  // Deduped, trimmed, and capped — a portfolio of 40 lines is already
  // generous, and the cap keeps one bad caller from turning into 500
  // outbound requests.
  const symbols = [...new Set(tickers.map((s) => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 40)
  if (!symbols.length) return json({ quotes: {} })

  const out: Record<string, unknown> = {}
  const results = await Promise.all(symbols.map(async (s) => [s, await meta(s)] as const))

  for (const [symbol, m] of results) {
    const raw = m?.regularMarketPrice
    const rawCurrency = (m?.currency || '').toUpperCase()
    // An unknown ticker comes back without a price. Say nothing about it
    // rather than inventing a zero, which would read as "your ETF is
    // worthless" on the screen that shows your net worth.
    if (typeof raw !== 'number' || !isFinite(raw) || !rawCurrency) continue

    // Some exchanges quote in minor units — London quotes many lines in pence
    // as "GBp". Missing this makes a portfolio look 100x too big.
    const isMinor = rawCurrency === 'GBP' && (m?.currency === 'GBp' || m?.currency === 'GBX')
    const major = isMinor ? raw / 100 : raw

    const rate = await rateTo(rawCurrency, currency)
    if (rate == null) continue
    out[symbol] = {
      price: Math.round(major * rate * 10000) / 10000,
      currency,
      raw: major,
      rawCurrency,
      rate,
    }
  }

  return json({ quotes: out, at: new Date().toISOString() })
})
