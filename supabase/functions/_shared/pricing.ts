// Yahoo Finance price resolution — stocks/ETFs by ticker, European mutual
// funds (Fondos de inversión) by ISIN. Shared by `quotes` (interactive,
// on-demand) and `refresh-holdings` (the daily cron) so both use exactly one
// tested implementation instead of two copies that can silently drift apart.
//
// A fund's NAV isn't queryable by ISIN directly — the chart endpoint only
// takes Yahoo's own internal symbols. Resolving an ISIN to one first is a
// search call (slower, less reliable than the price lookup itself) — verified
// empirically against three real Vanguard fund ISINs before relying on it:
// search resolves e.g. IE0032620787 to "0P00000G12.F", and the same chart
// endpoint used for tickers returns a real NAV (79.94 EUR, instrumentType
// MUTUALFUND) for that symbol.
const CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/'
const SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search?q='
// Yahoo returns 401/429 to requests without a browser-shaped User-Agent.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

type Meta = { regularMarketPrice?: number; currency?: string }

export async function meta(symbol: string): Promise<Meta | null> {
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
export async function resolveIsin(isin: string): Promise<string | null> {
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
// one source and can't disagree about the day. Module-scope cache: within one
// invocation (one HTTP request to `quotes`, or one cron run touching many
// holdings), the same currency pair is resolved once and reused — a fresh
// instance starts with an empty cache, which is correct: yesterday's rate
// should never leak into today's run.
const rates = new Map<string, number>()
export async function rateTo(from: string, to: string): Promise<number | null> {
  if (from === to) return 1
  const key = `${from}${to}`
  if (rates.has(key)) return rates.get(key)!
  const m = await meta(`${from}${to}=X`)
  const r = m?.regularMarketPrice
  if (typeof r !== 'number' || !isFinite(r) || r <= 0) return null
  rates.set(key, r)
  return r
}

// `exactCurrency` is passed through in its ORIGINAL case on purpose — Yahoo
// marks minor-unit (pence) lines with a lowercase "GBp"/"GBX", distinct from
// major-unit "GBP". Collapsing both to uppercase before checking (an earlier
// version of this did) would divide an already-correct GBP price by 100 by
// mistake — a real bug caught and fixed before it shipped, not a hypothetical.
export async function quote(raw: number, exactCurrency: string, targetCurrency: string) {
  const rawCurrency = exactCurrency.toUpperCase()
  const isMinor = exactCurrency === 'GBp' || exactCurrency === 'GBX'
  const major = isMinor ? raw / 100 : raw
  const rate = await rateTo(rawCurrency, targetCurrency)
  if (rate == null) return null
  return { price: Math.round(major * rate * 10000) / 10000, currency: targetCurrency, raw: major, rawCurrency, rate }
}

// One ticker or fund, fully resolved. Returns null price fields (but keeps
// `symbol` for a fund, so a successful ISIN resolution is never wasted) when
// there's genuinely nothing to report — an unknown identifier, or a market
// that hasn't traded (weekend/holiday). Callers should leave a holding's
// stored price untouched in that case rather than overwrite it with nothing.
export async function priceOne(
  id: { ticker: string } | { isin: string; symbol?: string | null },
  targetCurrency: string
) {
  const symbol = 'ticker' in id ? id.ticker : id.symbol || (await resolveIsin(id.isin))
  if (!symbol) return { symbol: null }
  const m = await meta(symbol)
  const raw = m?.regularMarketPrice
  if (typeof raw !== 'number' || !isFinite(raw) || !m?.currency) return { symbol }
  const q = await quote(raw, m.currency, targetCurrency)
  return q ? { ...q, symbol } : { symbol }
}
