import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { monthRange } from '../lib/format'

// Recurring monthly items (subscriptions + recurring income), private to the user.
export function useRecurring() {
  const { household, user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('recurring')
      .select('*')
      .eq('owner', user.id)
      .order('created_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  // Generate this month's entries for any active items right now.
  const materialize = useCallback(async () => {
    const start = monthRange(new Date()).start
    await supabase.rpc('materialize_recurring', { p_month: start })
  }, [])

  const add = useCallback(
    async (row, { materialize: shouldMaterialize = true } = {}) => {
      const { data, error } = await supabase
        .from('recurring')
        .insert({ household_id: household.id, owner: user.id, ...row })
        .select()
        .single()
      if (!error) {
        if (shouldMaterialize) await materialize()
        await load()
      }
      return { data, error }
    },
    [household?.id, user?.id, load, materialize]
  )

  const toggle = useCallback(
    async (id, active) => {
      const { error } = await supabase.from('recurring').update({ active }).eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  // Only the label. Amount, category and scope stay put — changing those would
  // silently rewrite what gets charged from next month, which is a different
  // decision than fixing a name you can no longer tell apart.
  const rename = useCallback(
    async (id, name) => {
      const clean = (name || '').trim()
      if (!clean) return { error: new Error('Give it a name') }
      const { error } = await supabase.from('recurring').update({ name: clean }).eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const remove = useCallback(
    async (id) => {
      const { error } = await supabase.from('recurring').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  return { items, loading, add, toggle, rename, remove, reload: load }
}
