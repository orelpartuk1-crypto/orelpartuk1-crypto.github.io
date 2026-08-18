import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { monthRange } from '../lib/format'

// Bonuses (this month) for the household. Recurring bills (e.g. rent) used to
// live here too, but that mechanism was retired — rent is now a normal
// recurring expense (see src/pages/Recurring.jsx) and the `recurring_bills`
// table is no longer read or written anywhere in the app.
export function useMoney(base = new Date()) {
  const { household, user } = useAuth()
  const [bonuses, setBonuses] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!household?.id) return
    setLoading(true)
    try {
      const { start } = monthRange(base)
      const monthStart = start // first day of the month, YYYY-MM-01
      const { data: b } = await supabase
        .from('incomes')
        .select('*')
        .eq('household_id', household.id)
        .eq('month', monthStart)
        .order('created_at', { ascending: false })
      setBonuses(b || [])
    } catch (e) {
      console.error('useMoney load failed', e)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, base.getFullYear(), base.getMonth()])

  useEffect(() => {
    load()
  }, [load])

  const addBonus = useCallback(
    async ({ amount, bonus_type, month, note, recurring_id = null, account_id = null }) => {
      const { error } = await supabase.from('incomes').insert({
        household_id: household.id,
        owner: user.id,
        kind: 'bonus',
        bonus_type: bonus_type || 'Bonus',
        amount,
        month,
        note: note || null,
        recurring_id,
        account_id,
      })
      if (!error) await load()
      return { error }
    },
    [household?.id, user?.id, load]
  )

  const deleteBonus = useCallback(
    async (id) => {
      const { error } = await supabase.from('incomes').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  return { bonuses, loading, reload: load, addBonus, deleteBonus }
}
