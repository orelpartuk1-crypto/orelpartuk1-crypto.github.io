import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { monthRange } from '../lib/format'

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
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, base.getFullYear(), base.getMonth()])

  useEffect(() => {
    load()
  }, [load])

  const addExpense = useCallback(
    async (row) => {
      const { error } = await supabase.from('expenses').insert({
        household_id: household.id,
        ...row,
      })
      if (!error) await load()
      return { error }
    },
    [household?.id, load]
  )

  const updateExpense = useCallback(
    async (id, row) => {
      const { error } = await supabase.from('expenses').update(row).eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const deleteExpense = useCallback(
    async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const setCategoryBudget = useCallback(
    async (category, monthly_limit) => {
      const { error } = await supabase
        .from('category_budgets')
        .upsert(
          { household_id: household.id, category, monthly_limit },
          { onConflict: 'household_id,category' }
        )
      if (!error) await load()
      return { error }
    },
    [household?.id, load]
  )

  return { expenses, budgets, loading, error, reload: load, addExpense, updateExpense, deleteExpense, setCategoryBudget }
}
