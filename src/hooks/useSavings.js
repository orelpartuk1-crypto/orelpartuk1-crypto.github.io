import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Personal savings goals + contributions. Private to the signed-in user (RLS).
export function useSavings() {
  const { user, household } = useAuth()
  const [goals, setGoals] = useState([])
  const [contribs, setContribs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: g } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: true })
      const goalIds = (g || []).map((x) => x.id)
      let c = []
      if (goalIds.length) {
        const { data } = await supabase
          .from('savings_contributions')
          .select('*')
          .in('goal_id', goalIds)
          .order('created_at', { ascending: false })
        c = data || []
      }
      setGoals(g || [])
      setContribs(c)
    } catch (e) {
      console.error('useSavings load failed', e)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const addGoal = useCallback(
    async (name, target_amount, scope = 'private', target_date = null, kind = 'saving') => {
      const { error } = await supabase.from('savings_goals').insert({
        owner: user.id,
        name,
        target_amount,
        scope,
        kind,
        target_date: target_date || null,
        household_id: scope === 'shared' ? household?.id : null,
      })
      if (!error) await load()
      return { error }
    },
    [user?.id, household?.id, load]
  )

  const deleteGoal = useCallback(
    async (id) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const addContribution = useCallback(
    async (goal_id, amount, note) => {
      const { error } = await supabase
        .from('savings_contributions')
        .insert({ goal_id, amount, note, contributor: user.id })
      if (!error) await load()
      return { error }
    },
    [user?.id, load]
  )

  // Roll up saved-so-far per goal.
  const savedByGoal = {}
  for (const c of contribs) savedByGoal[c.goal_id] = (savedByGoal[c.goal_id] || 0) + Number(c.amount)

  return { goals, contribs, savedByGoal, loading, addGoal, deleteGoal, addContribution, reload: load }
}
