import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { monthRange } from '../lib/format'

// Returns { [memberId]: pct } — each person's shared-treat spend as a fraction
// of their own income. Computed server-side; salaries are never exposed here.
export function useTreatPct(base = new Date()) {
  const { household } = useAuth()
  const [pct, setPct] = useState({})

  useEffect(() => {
    if (!household?.id) return
    const start = monthRange(base).start
    supabase
      .rpc('treat_income_pct', { p_month: start })
      .then(({ data }) => {
        const map = {}
        for (const r of data || []) map[r.member_id] = Number(r.pct) || 0
        setPct(map)
      })
      .catch((e) => console.error('useTreatPct load failed', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, base.getFullYear(), base.getMonth()])

  return pct
}
