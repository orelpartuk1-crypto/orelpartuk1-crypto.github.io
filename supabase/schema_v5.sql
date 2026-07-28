-- ============================================================================
--  Duo Budget — Schema upgrade v5  (itemized groceries)
--  Additive + idempotent. Run in Supabase -> SQL Editor -> New query -> Run.
-- ============================================================================

-- Store the individual items of an expense (mainly for groceries) as JSON:
--   [{ "name": "Shampoo", "price": 3.20 }, { "name": "Milk", "price": 1.10 }]
alter table public.expenses
  add column if not exists items jsonb;
