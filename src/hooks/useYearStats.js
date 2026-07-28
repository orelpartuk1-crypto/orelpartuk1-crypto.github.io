import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Your income + spending gathered so far this year, used to project the year.
export function useYearStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ bonusesYTD: 0, spendYTD: 0, monthsElapsed: new Date().getMonth() + 1 })

  useEffect(() => {
    if (!user?.id) return
    const now = new Date()
    const y = now.getFullYear()
    const start = `${y}-01-01`
    const end = `${y}-12-31`
    ;(async () => {
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase.from('incomes').select('amount, month').eq('owner', user.id).gte('month', start).lte('month', end),
        supabase.from('expenses').select('amount, spent_at').eq('paid_by', user.id).neq('scope', 'business').gte('spent_at', start).lte('spent_at', end),
      ])

      // Base "months elapsed" on when you actually started tracking, not just
      // the calendar month number — otherwise someone who started in June
      // gets July's spending divided by 7, wildly understating the average
      // and breaking the yearly projection.
      const activityDates = [
        ...(inc || []).map((r) => r.month),
        ...(exp || []).map((r) => r.spent_at),
      ].map((d) => new Date(d))
      const earliest = activityDates.length ? new Date(Math.min(...activityDates)) : now
      const monthsElapsed = Math.max(
        1,
        (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1
      )

      setStats({
        bonusesYTD: (inc || []).reduce((t, r) => t + Number(r.amount), 0),
        spendYTD: (exp || []).reduce((t, r) => t + Number(r.amount), 0),
        monthsElapsed,
      })
    })()
  }, [user?.id])

  return stats
}
