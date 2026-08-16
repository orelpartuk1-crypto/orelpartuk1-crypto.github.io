import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isoDay } from '../lib/format'

// One row per day, written from today onward — there is nothing to back-fill
// from, since net worth was never tracked before this existed. The chart
// starts empty and grows a real point at a time rather than drawing a shape
// that would have to be invented.
export function useNetWorthHistory() {
  const { household, user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('owner', user.id)
      .order('snapshot_date', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // Records today's figure once per day. Safe to call on every visit — the
  // unique (owner, date) constraint makes it an update, not a new row, so
  // opening the screen five times today still leaves exactly one point.
  const recordToday = useCallback(
    async ({ liquid, assets, debts }) => {
      if (!household?.id || !user?.id) return
      const net = liquid + assets - debts
      const { error } = await supabase.from('net_worth_snapshots').upsert(
        { household_id: household.id, owner: user.id, snapshot_date: isoDay(new Date()), liquid, assets, debts, net },
        { onConflict: 'owner,snapshot_date' }
      )
      if (!error) await load()
    },
    [household?.id, user?.id, load]
  )

  return { rows, loading, recordToday, reload: load }
}
