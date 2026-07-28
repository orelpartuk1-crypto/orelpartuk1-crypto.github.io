-- ============================================================================
--  Duo Budget — Schema upgrade v11  (adjustable partial split)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ----------------------------------------------------------------------------
--  owed_amount = euros the OTHER partner owes the payer for this shared expense.
--  NULL  -> fall back to the default rule (needs split 50/50, treats each own).
--  0..amount -> the payer explicitly set how much the other owes them.
-- ============================================================================
alter table public.expenses
  add column if not exists owed_amount numeric(10,2);

notify pgrst, 'reload schema';
