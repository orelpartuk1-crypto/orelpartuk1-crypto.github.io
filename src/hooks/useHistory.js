import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isoDay } from '../lib/format'

// Raw expense rows for the last `months` months (including the current one),
// so the money coach can reason over trends, not just this-vs-last month.
// Returns the columns the coach needs; the caller slices by zone.
export function useHistory(months = 6) {
  const { household } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household?.id) return
    let alive = true
    setLoading(true)

    const now = new Date()
    const start = isoDay(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1))

    ;(async () => {
      const { data } = await supabase
        .from('expenses')
        .select('amount, category, spend_type, scope, paid_by, spent_at')
        .eq('household_id', household.id)
        .gte('spent_at', start)
      if (!alive) return
      setRows(data || [])
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [household?.id, months])

  return { rows, loading }
}
