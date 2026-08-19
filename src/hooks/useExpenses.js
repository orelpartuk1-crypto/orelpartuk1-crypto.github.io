import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { monthRange } from '../lib/format'
import { enqueue, withOutbox } from '../lib/outbox'

// Fetches expenses + category budgets for the household, scoped to a month.
export function useExpenses(base = new Date()) {
  const { household } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [budgets, setBudgets] = useState([]) // category_budgets rows
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!household?.id) return
    setLoading(true)
    try {
      const { start, end } = monthRange(base)
      const [{ data: exp, error: e1 }, { data: bud, error: e2 }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('household_id', household.id)
          .gte('spent_at', start)
          .lte('spent_at', end)
          .order('spent_at', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('category_budgets').select('*').eq('household_id', household.id),
      ])
      setExpenses(exp || [])
      setBudgets(bud || [])
      setError(e1 || e2 || null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, base.getFullYear(), base.getMonth()])

  useEffect(() => {
    load()
  }, [load])

  // Returns the inserted row too — the scan flow needs its id to file the
  // receipt image under a path the storage policies can check.
  //
  // If the request can't reach the server at all, the expense is queued in
  // IndexedDB and replayed on reconnect rather than lost. `queued: true` comes
  // back so the caller can say so instead of claiming it saved. Note there is
  // no row id in that case, so anything that needs one (filing a receipt
  // image) has to stay online — it says so where it matters.
  const addExpense = useCallback(
    async (row) => {
      const payload = { household_id: household.id, ...row }
      try {
        const { data, error } = await supabase.from('expenses').insert(payload).select().single()
        if (!error) {
          await load()
          return { data, error }
        }
        // The server answered and refused — a real error, not a missing
        // network. Surfacing it beats silently queueing a write that would be
        // rejected again on every retry.
        return { data: null, error }
      } catch {
        await enqueue({ table: 'expenses', op: 'insert', payload })
        window.dispatchEvent(new Event('outbox-changed'))
        return { data: null, error: null, queued: true }
      }
    },
    [household?.id, load]
  )

  const updateExpense = useCallback(
    async (id, row) =>
      withOutbox(
        async () => {
          const { error } = await supabase.from('expenses').update(row).eq('id', id)
          if (!error) await load()
          return { error }
        },
        { table: 'expenses', op: 'update', payload: row, match: { id } }
      ),
    [load]
  )

  const deleteExpense = useCallback(
    async (id) =>
      withOutbox(
        async () => {
          const { error } = await supabase.from('expenses').delete().eq('id', id)
          if (!error) await load()
          return { error }
        },
        { table: 'expenses', op: 'delete', match: { id } }
      ),
    [load]
  )

  // Budgets are written through useBudgets — they carry a scope and an owner
  // now, which this hook's old household-wide upsert can no longer express.
  return { expenses, budgets, loading, error, reload: load, addExpense, updateExpense, deleteExpense }
}
