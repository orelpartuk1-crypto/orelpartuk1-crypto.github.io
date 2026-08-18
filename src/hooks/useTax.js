import { useCallback, useEffect, useMemo, useState } from 'react'
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
    try {
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
      setProfile(tp || { annual_income: 0, extra_expenses: 0, category_pct: {} })
      setBusinessRows(exp || [])
      setBusinessThisYear((exp || []).reduce((t, e) => t + Number(e.amount), 0))
    } catch (e) {
      console.error('useTax load failed', e)
    } finally {
      setLoading(false)
    }
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

  // % deductible per category comes from the user (or their gestor) — a
  // category missing from the map defaults to 100%, never invented by us.
  const categoryPct = profile?.category_pct || {}
  const pctFor = useCallback((cat) => (categoryPct[cat] != null ? Number(categoryPct[cat]) : 100), [categoryPct])

  const businessByCategory = useMemo(() => {
    const byCat = {}
    for (const e of businessRows) {
      byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount)
    }
    return Object.entries(byCat)
      .map(([category, total]) => {
        const pct = pctFor(category)
        return { category, total, pct, deductible: Math.round(total * (pct / 100) * 100) / 100 }
      })
      .sort((a, b) => b.total - a.total)
  }, [businessRows, pctFor])

  const deductibleThisYear = businessByCategory.reduce((t, c) => t + c.deductible, 0)

  const saveCategoryPct = useCallback(
    (category, pct) => save({ category_pct: { ...categoryPct, [category]: pct } }),
    [save, categoryPct]
  )

  return {
    profile, businessThisYear, businessRows, businessByCategory, deductibleThisYear,
    loading, save, saveCategoryPct, reload: load,
  }
}
