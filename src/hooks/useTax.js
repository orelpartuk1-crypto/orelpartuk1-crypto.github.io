import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Private tax data for the signed-in user: annual revenue + business expenses.
export function useTax() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [businessThisYear, setBusinessThisYear] = useState(0)
  const [businessRows, setBusinessRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const year = new Date().getFullYear()
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    const [{ data: tp }, { data: exp }] = await Promise.all([
      supabase.from('tax_profile').select('*').eq('owner', user.id).maybeSingle(),
      supabase
        .from('expenses')
        .select('spent_at, category, amount, note')
        .eq('paid_by', user.id)
        .eq('scope', 'business')
        .gte('spent_at', start)
        .lte('spent_at', end)
        .order('spent_at', { ascending: true }),
    ])
    setProfile(tp || { annual_income: 0, extra_expenses: 0 })
    setBusinessRows(exp || [])
    setBusinessThisYear((exp || []).reduce((t, e) => t + Number(e.amount), 0))
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (fields) => {
      const { error } = await supabase
        .from('tax_profile')
        .upsert({ owner: user.id, ...fields, updated_at: new Date().toISOString() })
      if (!error) await load()
      return { error }
    },
    [user?.id, load]
  )

  return { profile, businessThisYear, businessRows, loading, save, reload: load }
}
