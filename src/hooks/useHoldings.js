import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchQuotes, holdingValue, isTracked } from '../lib/quotes'

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

  // Live prices for anything that names a ticker and a number of units.
  // Everything else — a flat, a car, cash — keeps the value you typed, so
  // this does nothing at all for a household that tracks no investments.
  const [quotes, setQuotes] = useState({})
  const tickers = rows.filter(isTracked).map((r) => r.ticker).join(',')
  useEffect(() => {
    if (!tickers) { setQuotes({}); return }
    let alive = true
    fetchQuotes(tickers.split(',')).then((q) => { if (alive) setQuotes(q) })
    return () => { alive = false }
  }, [tickers])

  // Write the live figure back to the row. Everything that reads `holdings`
  // without going through this hook — net-worth snapshots most of all — would
  // otherwise keep recording the number last typed by hand.
  //
  // Only when it actually moved by more than a cent, so this doesn't turn into
  // a write on every render or every app open.
  useEffect(() => {
    const changed = rows.filter((r) => {
      if (!isTracked(r) || !quotes[String(r.ticker).toUpperCase()]) return false
      return Math.abs(holdingValue(r, quotes) - Number(r.value || 0)) > 0.01
    })
    if (!changed.length) return
    let alive = true
    ;(async () => {
      for (const r of changed) {
        const q = quotes[String(r.ticker).toUpperCase()]
        if (!alive) return
        await supabase
          .from('holdings')
          .update({
            value: holdingValue(r, quotes),
            unit_price: q.price,
            price_currency: q.currency,
            priced_at: new Date().toISOString(),
          })
          .eq('id', r.id)
      }
    })()
    return () => { alive = false }
  }, [quotes, rows])

  const refreshPrices = useCallback(async () => {
    const list = rows.filter(isTracked).map((r) => r.ticker)
    if (!list.length) return
    setQuotes(await fetchQuotes(list, { force: true }))
  }, [rows])

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

  // Every row carries the value the rest of the app should use, so nothing
  // downstream needs to know whether a price came from the market or from you.
  const priced = rows.map((r) =>
    isTracked(r) ? { ...r, value: holdingValue(r, quotes), live: !!quotes[String(r.ticker).toUpperCase()] } : r
  )
  const active = priced.filter((r) => r.active)
  const assets = active.filter((r) => r.kind !== 'debt')
  const debts = active.filter((r) => r.kind === 'debt')
  const assetsTotal = assets.reduce((t, r) => t + Number(r.value || 0), 0)
  const debtsTotal = debts.reduce((t, r) => t + Number(r.value || 0), 0)

  return { rows: priced, active, assets, debts, assetsTotal, debtsTotal, loading, quotes, refreshPrices, add, update, remove, reload: load }
}
