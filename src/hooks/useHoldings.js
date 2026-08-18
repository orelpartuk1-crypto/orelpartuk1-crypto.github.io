import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

  const active = rows.filter((r) => r.active)
  const assets = active.filter((r) => r.kind !== 'debt')
  const debts = active.filter((r) => r.kind === 'debt')
  const assetsTotal = assets.reduce((t, r) => t + Number(r.value || 0), 0)
  const debtsTotal = debts.reduce((t, r) => t + Number(r.value || 0), 0)

  return { rows, active, assets, debts, assetsTotal, debtsTotal, loading, add, update, remove, reload: load }
}
