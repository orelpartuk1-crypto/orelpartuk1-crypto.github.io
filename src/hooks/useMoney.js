import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { monthRange } from '../lib/format'

// Bonuses (this month) + recurring bills (e.g. rent) for the household.
export function useMoney(base = new Date()) {
  const { household, user } = useAuth()
  const [bonuses, setBonuses] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!household?.id) return
    setLoading(true)
    const { start } = monthRange(base)
    const monthStart = start // first day of the month, YYYY-MM-01
    const [{ data: b }, { data: bl }] = await Promise.all([
      supabase
        .from('incomes')
        .select('*')
        .eq('household_id', household.id)
        .eq('month', monthStart)
        .order('created_at', { ascending: false }),
      supabase.from('recurring_bills').select('*').eq('household_id', household.id),
    ])
    setBonuses(b || [])
    setBills(bl || [])
    setLoading(false)
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

  const saveBill = useCallback(
    async (bill) => {
      // upsert-ish: update when id present, else insert
      const payload = { household_id: household.id, ...bill }
      const { error } = bill.id
        ? await supabase.from('recurring_bills').update(payload).eq('id', bill.id)
        : await supabase.from('recurring_bills').insert(payload)
      if (!error) await load()
      return { error }
    },
    [household?.id, load]
  )

  const deleteBill = useCallback(
    async (id) => {
      const { error } = await supabase.from('recurring_bills').delete().eq('id', id)
      if (!error) await load()
      return { error }
    },
    [load]
  )

  const activeBills = bills.filter((b) => b.active)

  return { bonuses, bills, activeBills, loading, reload: load, addBonus, deleteBonus, saveBill, deleteBill }
}
