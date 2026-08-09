import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Survives unmounting, so coming back to the list shows the rows you were just
// looking at instead of an empty screen while the whole table is refetched.
const cache = new Map() // household id -> rows

// All expenses you're allowed to see (your own + shared), newest first.
export function useAllExpenses() {
  const { household } = useAuth()
  const hid = household?.id
  const [expenses, setExpenses] = useState(() => (hid && cache.get(hid)) || [])
  // Only a genuinely cold screen should show a spinner; a revalidation happens
  // quietly underneath the rows that are already on screen.
  const [loading, setLoading] = useState(() => !(hid && cache.has(hid)))
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const load = useCallback(async () => {
    if (!hid) return
    if (!cache.has(hid)) setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', hid)
      .order('spent_at', { ascending: false })
      .order('created_at', { ascending: false })
    const rows = data || []
    cache.set(hid, rows)
    if (!alive.current) return
    setExpenses(rows)
    setLoading(false)
  }, [hid])

  // Show whatever we already have for this household the moment it changes,
  // then refresh in the background.
  useEffect(() => {
    if (hid && cache.has(hid)) {
      setExpenses(cache.get(hid))
      setLoading(false)
    }
    load()
  }, [hid, load])

  const deleteExpense = useCallback(
    async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (!error) {
        // Drop it locally first so the row disappears on tap, not after a round trip.
        if (hid && cache.has(hid)) cache.set(hid, cache.get(hid).filter((e) => e.id !== id))
        setExpenses((rows) => rows.filter((e) => e.id !== id))
        await load()
      }
      return { error }
    },
    [hid, load]
  )

  return { expenses, loading, deleteExpense, reload: load }
}
