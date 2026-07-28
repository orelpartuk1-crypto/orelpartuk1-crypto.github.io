import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// All expenses you're allowed to see (your own + shared), newest first.
export function useAllExpenses() {
  const { household } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!household?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', household.id)
      .order('spent_at', { ascending: false })
      .order('created_at', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }, [household?.id])

  useEffect(() => {
    load()
  }, [load])

  const deleteExpense = useCallback(
    async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  return { expenses, loading, deleteExpense, reload: load }
}
