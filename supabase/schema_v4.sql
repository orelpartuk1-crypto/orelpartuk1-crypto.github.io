-- ============================================================================
--  Duo Budget — Schema upgrade v4
--  Full data division + explicit 50/50 split + business owner flag.
--  Additive + idempotent. Run in Supabase -> SQL Editor -> New query -> Run.
-- ============================================================================

-- ---------- Private per-user settings (income + business flag) ----------------
-- Moved OUT of profiles so a partner can never read the other's income.
create table if not exists public.user_private (
  owner          uuid primary key references public.profiles(id) on delete cascade,
  monthly_income numeric(10,2) not null default 0,
  has_business   boolean not null default false,
  updated_at     timestamptz not null default now()
);
-- migrate existing salaries across
insert into public.user_private (owner, monthly_income)
  select id, monthly_income from public.profiles
  on conflict (owner) do nothing;

-- ---------- Expenses: explicit 50/50 split flag -------------------------------
alter table public.expenses
  add column if not exists split boolean not null default false;

-- ============================================================================
--  RLS — full division
--   * shared expenses: visible to the whole household
--   * private / business expenses: visible ONLY to the person who paid
--   * everyone writes only their own rows
-- ============================================================================
drop policy if exists expenses_all on public.expenses;
drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_update on public.expenses;
drop policy if exists expenses_delete on public.expenses;

create policy expenses_select on public.expenses for select using (
  paid_by = auth.uid()
  or (scope = 'shared' and household_id = public.current_household_id())
);
create policy expenses_insert on public.expenses for insert with check (
  paid_by = auth.uid() and household_id = public.current_household_id()
);
create policy expenses_update on public.expenses for update
  using (paid_by = auth.uid()) with check (paid_by = auth.uid());
create policy expenses_delete on public.expenses for delete
  using (paid_by = auth.uid());

-- Income (salary bonuses): private to the owner only
drop policy if exists incomes_all on public.incomes;
create policy incomes_all on public.incomes for all
  using (owner = auth.uid()) with check (owner = auth.uid());

-- user_private: owner only
alter table public.user_private enable row level security;
drop policy if exists user_private_all on public.user_private;
create policy user_private_all on public.user_private for all
  using (owner = auth.uid()) with check (owner = auth.uid());

grant select, insert, update, delete on public.user_private to authenticated;
