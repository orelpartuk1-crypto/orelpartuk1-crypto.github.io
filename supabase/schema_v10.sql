-- ============================================================================
--  Duo Budget — Schema upgrade v10  (savings goals: optional target date)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ============================================================================
alter table public.savings_goals
  add column if not exists target_date date;

notify pgrst, 'reload schema';
