-- ============================================================================
--  Duo Budget — Schema upgrade v9  (autónomo tax: social security + gestor)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ============================================================================
alter table public.tax_profile add column if not exists monthly_ss numeric(10,2) not null default 0;
alter table public.tax_profile add column if not exists accountant_annual numeric(10,2) not null default 0;
notify pgrst, 'reload schema';
