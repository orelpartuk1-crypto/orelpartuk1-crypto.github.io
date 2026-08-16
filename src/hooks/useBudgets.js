import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Two kinds of limit, deliberately kept apart. A shared budget is a joint
// agreement — both of you see it and either can change it. A personal budget is
// yours alone, and your partner never sees it, the same rule the private
// expenses follow.
export function useBudgets() {
  const { household, user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!household?.id) return
    setLoading(true)
    // RLS returns shared rows plus only your own personal ones.
    const { data } = await supabase.from('category_budgets').select('*').eq('household_id', household.id)
    setRows(data || [])
    setLoading(false)
  }, [household?.id])

  useEffect(() => { load() }, [load])

  const set = useCallback(
    async (category, monthly_limit, scope = 'shared') => {
      const owner = scope === 'shared' ? null : user.id
      const limit = Number(monthly_limit) || 0

      // Clearing a limit removes the row rather than storing a zero, so the
      // category simply stops having a budget instead of having one of nothing.
      if (limit <= 0) {
        let q = supabase.from('category_budgets').delete()
          .eq('household_id', household.id).eq('category', category).eq('scope', scope)
        q = owner ? q.eq('owner', owner) : q.is('owner', null)
        const { error } = await q
        if (!error) await load()
        return { error }
      }

      // Not an upsert: the uniqueness is enforced by two PARTIAL indexes (one
      // for shared rows where owner is null, one for personal rows), and
      // ON CONFLICT cannot express an index predicate — PostgREST would reject
      // it as having no matching constraint. Look it up, then update or insert.
      let find = supabase.from('category_budgets').select('id')
        .eq('household_id', household.id).eq('category', category).eq('scope', scope)
      find = owner ? find.eq('owner', owner) : find.is('owner', null)
      const { data: existing } = await find.maybeSingle()

      const { error } = existing
        ? await supabase.from('category_budgets').update({ monthly_limit: limit }).eq('id', existing.id)
        : await supabase.from('category_budgets')
            .insert({ household_id: household.id, category, monthly_limit: limit, scope, owner })
      if (!error) await load()
      return { error }
    },
    [household?.id, user?.id, load]
  )

  // category -> limit, for one scope at a time.
  const mapFor = useCallback(
    (scope) =>
      Object.fromEntries(
        rows
          .filter((r) => r.scope === scope && (scope === 'shared' ? !r.owner : r.owner === user?.id))
          .map((r) => [r.category, Number(r.monthly_limit)])
      ),
    [rows, user?.id]
  )

  const shared = useMemo(() => mapFor('shared'), [mapFor])
  const personal = useMemo(() => mapFor('private'), [mapFor])

  return { rows, shared, personal, mapFor, loading, set, reload: load }
}
