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
    try {
      const [{ data: accs }, { data: bals }] = await Promise.all([
        supabase.from('accounts').select('*').eq('owner', user.id).order('sort_order').order('created_at'),
        supabase.rpc('account_balances'),
      ])
      setAccounts(accs || [])
      setBalances(Object.fromEntries((bals || []).map((b) => [b.account_id, Number(b.balance)])))
    } catch (e) {
      console.error('useAccounts load failed', e)
    } finally {
      setLoading(false)
    }
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
  //
  // If the one being removed is the default, another active account is
  // promoted first. Without this, deleting your default account would leave
  // none — and worse, a household could end up with two accounts BOTH marked
  // default (one stale from before, one set by some later flow), which is
  // exactly the state that made the delete button vanish for both of them:
  // the UI hides "Delete" on a default account since removing it silently
  // shouldn't leave you with no default at all. Promoting one up front means
  // there's only ever one default, so the button never has to hide.
  const remove = useCallback(
    async (id) => {
      const target = accounts.find((a) => a.id === id)
      if (target?.is_default) {
        const next = accounts.find((a) => a.id !== id && a.active)
        if (next) await supabase.from('accounts').update({ is_default: true }).eq('id', next.id)
      }
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [accounts, load]
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
