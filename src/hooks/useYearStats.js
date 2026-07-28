import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Your income + spending gathered so far this year, used to project the year.
export function useYearStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ bonusesYTD: 0, spendYTD: 0, monthsElapsed: new Date().getMonth() + 1 })

  useEffect(() => {
    if (!user?.id) return
    const y = new Date().getFullYear()
    const start = `${y}-01-01`
    const end = `${y}-12-31`
    ;(async () => {
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase.from('incomes').select('amount, month').eq('owner', user.id).gte('month', start).lte('month', end),
        supabase.from('expenses').select('amount').eq('paid_by', user.id).neq('scope', 'business').gte('spent_at', start).lte('spent_at', end),
      ])
      setStats({
        bonusesYTD: (inc || []).reduce((t, r) => t + Number(r.amount), 0),
        spendYTD: (exp || []).reduce((t, r) => t + Number(r.amount), 0),
        monthsElapsed: new Date().getMonth() + 1,
      })
    })()
  }, [user?.id])

  return stats
}
