import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Categories belong to the household, not to a person — a shared expense has to
// mean the same thing to both of you for any report to make sense.
//
// A subcategory never replaces its parent for reporting. The database keeps
// expenses.category pinned to the root name, so every total that existed before
// subcategories keeps adding up exactly as it did.
export function useCategories() {
  const { household } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!household?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .order('sort_order')
      .order('name')
    setRows(data || [])
    setLoading(false)
  }, [household?.id])

  useEffect(() => { load() }, [load])

  const add = useCallback(
    async (row) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ household_id: household.id, ...row })
        .select()
        .single()
      if (!error) await load()
      return { data, error }
    },
    [household?.id, load]
  )

  const update = useCallback(
    async (id, row) => {
      const { error } = await supabase.from('categories').update(row).eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  // Deleting a parent takes its children with it (ON DELETE CASCADE), and any
  // expense that pointed at it keeps its text category — the FK is SET NULL, so
  // history never disappears along with the label.
  const remove = useCallback(
    async (id) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const tree = useMemo(() => {
    const build = (scope) => {
      const inScope = rows.filter((r) => r.scope === scope && r.active)
      return inScope
        .filter((r) => !r.parent_id)
        .map((parent) => ({ ...parent, children: inScope.filter((c) => c.parent_id === parent.id) }))
    }
    return { expense: build('expense'), business: build('business') }
  }, [rows])

  // Flat picker list: a parent, then anything under it, so choosing is one pass.
  const pickList = useCallback(
    (scope) =>
      tree[scope === 'business' ? 'business' : 'expense'].flatMap((p) => [
        { ...p, depth: 0 },
        ...p.children.map((c) => ({ ...c, depth: 1, parentName: p.name })),
      ]),
    [tree]
  )

  const byId = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows])
  const rootNameOf = useCallback(
    (id) => {
      let node = byId[id]
      while (node?.parent_id) node = byId[node.parent_id]
      return node?.name || null
    },
    [byId]
  )

  return { rows, tree, pickList, byId, rootNameOf, loading, add, update, remove, reload: load }
}
