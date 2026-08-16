import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Accounts are personal — there is no shared account and no shared balance.
// A shared expense still comes out of whoever's account paid for it; what makes
// it shared is the scope, not the wallet. Settling up at the end of the month is
// a real movement between two people's accounts, which is what squares them.
export function useAccounts() {
  const { household, user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState({}) // account id -> number
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const [{ data: accs }, { data: bals }] = await Promise.all([
      supabase.from('accounts').select('*').eq('owner', user.id).order('sort_order').order('created_at'),
      supabase.rpc('account_balances'),
    ])
    setAccounts(accs || [])
    setBalances(Object.fromEntries((bals || []).map((b) => [b.account_id, Number(b.balance)])))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const add = useCallback(
    async (row) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ household_id: household.id, owner: user.id, ...row })
        .select()
        .single()
      if (!error) await load()
      return { data, error }
    },
    [household?.id, user?.id, load]
  )

  const update = useCallback(
    async (id, row) => {
      const { error } = await supabase.from('accounts').update(row).eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  // Expenses keep their history — the FK is ON DELETE SET NULL, so removing an
  // account never removes what was spent from it.
  const remove = useCallback(
    async (id) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const transfer = useCallback(
    async ({ from_account, to_account, amount, note, transferred_at }) => {
      const { error } = await supabase.from('transfers').insert({
        household_id: household.id,
        created_by: user.id,
        from_account,
        to_account,
        amount,
        note: note || null,
        ...(transferred_at ? { transferred_at } : {}),
      })
      if (!error) await load()
      return { error }
    },
    [household?.id, user?.id, load]
  )

  const active = accounts.filter((a) => a.active)
  const defaultAccount = active.find((a) => a.is_default) || active[0] || null
  const total = active.reduce((t, a) => t + (balances[a.id] ?? 0), 0)

  return { accounts, active, balances, defaultAccount, total, loading, add, update, remove, transfer, reload: load }
}
