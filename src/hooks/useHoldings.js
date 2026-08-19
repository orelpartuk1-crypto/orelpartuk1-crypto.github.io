import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchQuotes, holdingValue, isTracked, holdingPnl } from '../lib/quotes'

// The identifier a holding is priced by — a ticker for stock/ETF, an ISIN for
// a European mutual fund (Fondo de inversión). One row is always exactly one
// or the other, never both, so callers that only need "what do I look this
// row up by" don't have to know which asset_type they're looking at.
const priceId = (r) => (r.asset_type === 'fund' ? r.isin : r.ticker)

// What you own and owe outside your day-to-day accounts. Personal, like the
// accounts themselves — there is no shared net worth.
//
// Debts are stored as a positive number and subtracted at the point of use, so
// nobody has to remember to type a minus sign for a loan to behave like one.
export function useHoldings() {
  const { household, user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('holdings')
        .select('*')
        .eq('owner', user.id)
        .order('sort_order')
        .order('created_at')
      setRows(data || [])
    } catch (e) {
      console.error('useHoldings load failed', e)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // Live prices for anything that names an identifier (ticker or ISIN) and a
  // number of units. Everything else — a flat, a car, cash — keeps the value
  // you typed, so this does nothing at all for a household that tracks no
  // investments.
  const [quotes, setQuotes] = useState({})
  const tracked = rows.filter(isTracked)
  const tickers = tracked.filter((r) => r.asset_type !== 'fund').map((r) => r.ticker).join(',')
  // A fund with a cached yahoo_symbol skips the slower ISIN-search step
  // server-side — passing it through is what makes every refresh after the
  // first one fast.
  const fundKey = tracked
    .filter((r) => r.asset_type === 'fund')
    .map((r) => `${r.isin}|${r.yahoo_symbol || ''}`)
    .join(',')
  useEffect(() => {
    if (!tickers && !fundKey) { setQuotes({}); return }
    let alive = true
    const funds = fundKey
      ? fundKey.split(',').map((s) => { const [isin, symbol] = s.split('|'); return { isin, symbol: symbol || null } })
      : []
    fetchQuotes(tickers ? tickers.split(',') : [], { funds }).then((q) => { if (alive) setQuotes(q) })
    return () => { alive = false }
  }, [tickers, fundKey])

  // Write the live figure back to the row. Everything that reads `holdings`
  // without going through this hook — net-worth snapshots most of all — would
  // otherwise keep recording the number last typed by hand.
  //
  // Only when the value actually moved by more than a cent, or a fund's
  // symbol was just resolved for the first time and needs caching — either
  // one alone shouldn't turn into a write on every render or every app open.
  useEffect(() => {
    const changed = rows.filter((r) => {
      const q = isTracked(r) ? quotes[String(priceId(r)).toUpperCase()] : null
      if (!q) return false
      const priceMoved = q.price != null && Math.abs(holdingValue(r, quotes) - Number(r.value || 0)) > 0.01
      const symbolLearned = r.asset_type === 'fund' && q.symbol && q.symbol !== r.yahoo_symbol
      return priceMoved || symbolLearned
    })
    if (!changed.length) return
    let alive = true
    ;(async () => {
      for (const r of changed) {
        const q = quotes[String(priceId(r)).toUpperCase()]
        if (!alive) return
        await supabase
          .from('holdings')
          .update({
            ...(q.price != null ? { value: holdingValue(r, quotes), unit_price: q.price, price_currency: q.currency, priced_at: new Date().toISOString() } : {}),
            ...(r.asset_type === 'fund' && q.symbol ? { yahoo_symbol: q.symbol } : {}),
          })
          .eq('id', r.id)
      }
    })()
    return () => { alive = false }
  }, [quotes, rows])

  const refreshPrices = useCallback(async () => {
    if (!tracked.length) return
    setQuotes(
      await fetchQuotes(
        tracked.filter((r) => r.asset_type !== 'fund').map((r) => r.ticker),
        { force: true, funds: tracked.filter((r) => r.asset_type === 'fund').map((r) => ({ isin: r.isin, symbol: r.yahoo_symbol })) }
      )
    )
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback(
    async (row) => {
      const { data, error } = await supabase
        .from('holdings')
        .insert({ household_id: household.id, owner: user.id, ...row })
        .select()
        .single()
      if (!error) await load()
      return { data, error }
    },
    [household?.id, user?.id, load]
  )

  const update = useCallback(
    async (id, row) => {
      const { error } = await supabase
        .from('holdings')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const remove = useCallback(
    async (id) => {
      const { error } = await supabase.from('holdings').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  // Every row carries the value (and, when there's a cost basis, the PnL) the
  // rest of the app should use, so nothing downstream needs to know whether a
  // price came from the market or from you, or whether it's a ticker or ISIN.
  const priced = rows.map((r) => {
    const withValue = isTracked(r)
      ? { ...r, value: holdingValue(r, quotes), live: !!quotes[String(priceId(r)).toUpperCase()]?.price }
      : r
    const pnl = holdingPnl(withValue, quotes)
    return pnl ? { ...withValue, pnl } : withValue
  })
  const active = priced.filter((r) => r.active)
  const assets = active.filter((r) => r.kind !== 'debt')
  const debts = active.filter((r) => r.kind === 'debt')
  const assetsTotal = assets.reduce((t, r) => t + Number(r.value || 0), 0)
  const debtsTotal = debts.reduce((t, r) => t + Number(r.value || 0), 0)

  return { rows: priced, active, assets, debts, assetsTotal, debtsTotal, loading, quotes, refreshPrices, add, update, remove, reload: load }
}
