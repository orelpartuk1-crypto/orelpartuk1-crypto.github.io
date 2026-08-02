-- ============================================================================
--  Duo Budget — Schema upgrade v16  (per-category business tax deductibility)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ----------------------------------------------------------------------------
--  The user (or their gestor) sets what % of each business expense category
--  is actually tax-deductible — the app never invents these percentages.
--  Stored as a simple {category: pct} map on the existing tax_profile row
--  (already private-per-owner via RLS). A category missing from the map is
--  treated as 100% deductible (the default, unless the user says otherwise).
-- ============================================================================
alter table public.tax_profile
  add column if not exists category_pct jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
