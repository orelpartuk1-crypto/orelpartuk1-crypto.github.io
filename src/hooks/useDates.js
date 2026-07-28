import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Next occurrence of a date. Recurring dates roll to this/next year.
export function nextOccurrence(iso, recurring) {
  const d = new Date(iso + 'T00:00:00')
  if (!recurring) return d
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return next
}

export function daysUntil(dateObj) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((dateObj - today) / 86400000)
}

// Important dates (birthdays, holidays…) — private to each user, with a budget.
export function useDates() {
  const { user } = useAuth()
  const [dates, setDates] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('important_dates')
      .select('*')
      .eq('owner', user.id)
    // sort by next occurrence ascending
    const withNext = (data || [])
      .map((d) => ({ ...d, _next: nextOccurrence(d.on_date, d.recurring) }))
      .sort((a, b) => a._next - b._next)
    setDates(withNext)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const addDate = useCallback(
    async (row) => {
      const { error } = await supabase.from('important_dates').insert({ owner: user.id, ...row })
      if (!error) await load()
      return { error }
    },
    [user?.id, load]
  )

  const deleteDate = useCallback(
    async (id) => {
      const { error } = await supabase.from('important_dates').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  return { dates, loading, addDate, deleteDate, reload: load }
}
