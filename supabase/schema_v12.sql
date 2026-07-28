-- ============================================================================
--  Duo Budget — Schema upgrade v12  (savings vs investments)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ----------------------------------------------------------------------------
--  A goal is either a plain 'saving' pot or an 'investment'. Contributions to
--  investment goals feed the "invested" bucket in the monthly balance; the
--  rest feed "saved".
-- ============================================================================
alter table public.savings_goals
  add column if not exists kind text not null default 'saving'
    check (kind in ('saving', 'investment'));

notify pgrst, 'reload schema';
