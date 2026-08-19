// Live market prices for tracked holdings — stocks/ETFs by ticker, and
// European mutual funds (Fondos de inversión) by ISIN.
//
// This has to be a server function rather than a fetch from the phone: Yahoo
// sends no CORS headers, so a browser request is rejected before it starts.
// Routing through here also means one set of requests for the whole household
// instead of one per device.
//
// The actual Yahoo mechanics (ISIN resolution, GBp/GBX minor-unit handling,
// FX conversion) live in `_shared/pricing.ts`, shared with the daily
// `refresh-holdings` cron so there's exactly one tested implementation, not
// two that can quietly drift apart.
//
// POST { tickers: ["VUAA.L"], funds: [{isin, symbol?}], currency: "EUR" }
//   -> { quotes: {
//          "VUAA.L": { price, currency, raw, rawCurrency, rate },
//          "IE0032620787": { price, currency, raw, rawCurrency, rate, symbol },
//        } }
// A fund entry always carries `symbol` back, resolved or not — the caller
// persists it so the next refresh skips the search step entirely.
import { corsHeaders } from '../_shared/cors.ts'
import { priceOne } from '../_shared/pricing.ts'

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

  const out: Record<string, unknown> = {}

  await Promise.all(
    symbols.map(async (symbol) => {
      const r = await priceOne({ ticker: symbol }, currency)
      if (r.price != null) out[symbol] = r
    })
  )

  await Promise.all(
    fundList.map(async (f) => {
      out[f.isin] = await priceOne({ isin: f.isin, symbol: f.symbol }, currency)
    })
  )

  return json({ quotes: out, at: new Date().toISOString() })
})
