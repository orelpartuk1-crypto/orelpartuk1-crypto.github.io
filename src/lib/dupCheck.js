import { supabase } from './supabase'

// Returns a matching expense (same person, date, category, amount) if one exists
// — used to warn about accidentally logging the same thing twice.
export async function findDuplicate({ household_id, paid_by, spent_at, category, amount }) {
  if (!household_id || !paid_by || !spent_at) return null
  const { data } = await supabase
    .from('expenses')
    .select('id, amount, category, spent_at')
    .eq('household_id', household_id)
    .eq('paid_by', paid_by)
    .eq('spent_at', spent_at)
    .eq('category', category)
    .eq('amount', Number(amount).toFixed(2))
    .limit(1)
  return (data && data[0]) || null
}
