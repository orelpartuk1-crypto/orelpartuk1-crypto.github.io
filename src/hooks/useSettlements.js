import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Paying your partner back. Unlike a transfer between your own accounts this is
// a shared fact — you both see it — but each side points it at one of their own
// accounts, so neither of you needs to see the other's wallet for the balances
// to come out right.
export function useSettlements() {
  const { household, user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!household?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('settlements')
      .select('*')
      .eq('household_id', household.id)
      .order('settled_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [household?.id])

  useEffect(() => { load() }, [load])

  const settle = useCallback(
    async ({ payer, payee, amount, payer_account = null, payee_account = null, note = null, settled_at }) => {
      const { error } = await supabase.from('settlements').insert({
        household_id: household.id,
        payer,
        payee,
        amount,
        // Only ever set your own side; the other person picks theirs when they
        // open the app, and until then their balance simply isn't affected yet.
        payer_account: payer === user?.id ? payer_account : null,
        payee_account: payee === user?.id ? payee_account : null,
        note,
        ...(settled_at ? { settled_at } : {}),
      })
      if (!error) await load()
      return { error }
    },
    [household?.id, user?.id, load]
  )

  // Point an existing settlement at one of my accounts — used when the other
  // person recorded it and my side is still unassigned.
  const claim = useCallback(
    async (id, accountId, side) => {
      const patch = side === 'payer' ? { payer_account: accountId } : { payee_account: accountId }
      const { error } = await supabase.from('settlements').update(patch).eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const remove = useCallback(
    async (id) => {
      const { error } = await supabase.from('settlements').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  // Settlements recorded by the other person that still need me to say which of
  // my accounts they touched, otherwise my balance silently ignores them.
  const needsMyAccount = rows.filter(
    (r) =>
      (r.payer === user?.id && !r.payer_account) ||
      (r.payee === user?.id && !r.payee_account)
  )

  return { rows, loading, settle, claim, remove, needsMyAccount, reload: load }
}
