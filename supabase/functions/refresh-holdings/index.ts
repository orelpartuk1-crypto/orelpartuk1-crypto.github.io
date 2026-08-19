// Daily, automatic price refresh for every tracked holding — runs whether or
// not anyone opens the app that day. Scheduled by pg_cron (see
// schema_v23.sql) once daily, after European markets close.
//
// Interactive pricing (the `quotes` function, called from the app while
// you're looking at Wealth) stays the source of truth for what you SEE right
// now — this cron exists so the DATABASE'S stored value/priced_at is never
// more than a day stale even if nobody opens the app, which matters for the
// net-worth history snapshots that read `holdings.value` directly.
//
// "Track forever, once a day" only works if a quiet day doesn't corrupt
// yesterday's answer: a weekend, a bank holiday, or Yahoo simply not
// answering all produce no price, and produce nothing to write — the row is
// left exactly as it was, which IS the "fall back to the last known closing
// NAV" behaviour, achieved by doing nothing rather than by writing a
// duplicate of yesterday's number.
//
// No per-household currency is stored anywhere (Settings → Currency lives in
// each phone's localStorage, never synced to the server), so this writes in
// EUR — the app's own default — as a best-effort background snapshot. The
// interactive path in the app still recomputes in whatever currency you have
// selected each time you actually open Wealth, which is what you actually see.
import { priceOne } from '../_shared/pricing.ts'

const SB = 'https://bckxqcyyvhxlcfbyvgzl.supabase.co'
const CURRENCY = 'EUR'

Deno.serve(async () => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) return new Response('Missing SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  const res = await fetch(
    `${SB}/rest/v1/holdings?select=id,asset_type,ticker,isin,yahoo_symbol,units&active=eq.true&units=gt.0`,
    { headers }
  )
  const rows = (await res.json()) || []
  if (!Array.isArray(rows) || !rows.length) return new Response('no tracked holdings')

  // Only rows that actually name an identifier — a plain typed-in asset
  // (a flat, a car) has neither a ticker nor an isin and is correctly
  // ignored here, exactly as the interactive path ignores it.
  const tracked = rows.filter((r: any) => (r.asset_type === 'fund' ? r.isin : r.ticker))

  let updated = 0
  let skipped = 0
  await Promise.all(
    tracked.map(async (r: any) => {
      const id = r.asset_type === 'fund' ? { isin: r.isin, symbol: r.yahoo_symbol } : { ticker: r.ticker }
      const q = await priceOne(id, CURRENCY)
      if (q.price == null) { skipped++; return } // weekend, holiday, or unresolvable — leave it be
      const patch: Record<string, unknown> = {
        value: Number(r.units) * q.price,
        unit_price: q.price,
        price_currency: q.currency,
        priced_at: new Date().toISOString(),
      }
      if (r.asset_type === 'fund' && q.symbol && q.symbol !== r.yahoo_symbol) patch.yahoo_symbol = q.symbol
      await fetch(`${SB}/rest/v1/holdings?id=eq.${r.id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      })
      updated++
    })
  )

  return new Response(`refreshed ${updated}, skipped ${skipped} of ${tracked.length} tracked holdings`)
})
