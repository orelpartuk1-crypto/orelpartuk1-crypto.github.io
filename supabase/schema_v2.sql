-- ============================================================================
--  Duo Budget — Schema upgrade v2  (fairness, need/treat, income, bills, shared savings)
--  Safe to run on top of the existing schema. Additive + idempotent.
--  Run in Supabase -> SQL Editor -> New query -> Run.
-- ============================================================================

-- ---------- Profiles: recurring monthly salary --------------------------------
alter table public.profiles
  add column if not exists monthly_income numeric(10,2) not null default 0;

-- ---------- Expenses: scope (private/shared) + need/treat ----------------------
alter table public.expenses
  add column if not exists scope text not null default 'shared'
    check (scope in ('private','shared'));
alter table public.expenses
  add column if not exists spend_type text not null default 'need'
    check (spend_type in ('need','treat'));

-- Migrate old data: kind 'personal' -> scope 'private'
update public.expenses
  set scope = case when kind = 'personal' then 'private' else 'shared' end
  where scope is null or scope = 'shared';

-- ---------- Income / bonuses (one-off, with a type) ---------------------------
create table if not exists public.incomes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner        uuid not null references public.profiles(id) on delete cascade,
  kind         text not null default 'bonus' check (kind in ('salary','bonus')),
  bonus_type   text,                              -- e.g. 'Work bonus','Freelance','Gift'
  amount       numeric(10,2) not null check (amount > 0),
  month        date not null default date_trunc('month', current_date)::date,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists incomes_household_idx on public.incomes (household_id, month desc);

-- ---------- Recurring monthly bills (e.g. rent) -------------------------------
-- payer pays `amount`; the other partner reimburses `other_share` each month.
create table if not exists public.recurring_bills (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  amount       numeric(10,2) not null check (amount >= 0),
  payer        uuid not null references public.profiles(id) on delete cascade,
  other_share  numeric(10,2) not null default 0,   -- what the non-payer owes the payer
  category     text not null default 'Rent',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- Savings goals: private OR shared ---------------------------------
alter table public.savings_goals
  add column if not exists scope text not null default 'private'
    check (scope in ('private','shared'));
alter table public.savings_goals
  add column if not exists household_id uuid references public.households(id) on delete cascade;
-- who added each contribution (matters for shared goals)
alter table public.savings_contributions
  add column if not exists contributor uuid references public.profiles(id) on delete set null;

-- ============================================================================
--  RLS for the new tables
-- ============================================================================
alter table public.incomes         enable row level security;
alter table public.recurring_bills enable row level security;

drop policy if exists incomes_all on public.incomes;
create policy incomes_all on public.incomes
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

drop policy if exists bills_all on public.recurring_bills;
create policy bills_all on public.recurring_bills
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- ---------- Savings goals: owner (private) OR household (shared) --------------
drop policy if exists goals_all on public.savings_goals;
create policy goals_select on public.savings_goals
  for select using (
    owner = auth.uid()
    or (scope = 'shared' and household_id = public.current_household_id())
  );
create policy goals_insert on public.savings_goals
  for insert with check (
    owner = auth.uid()
    and (scope = 'private' or household_id = public.current_household_id())
  );
create policy goals_update on public.savings_goals
  for update using (
    owner = auth.uid()
    or (scope = 'shared' and household_id = public.current_household_id())
  );
create policy goals_delete on public.savings_goals
  for delete using (
    owner = auth.uid()
    or (scope = 'shared' and household_id = public.current_household_id())
  );

-- ---------- Contributions: accessible if the parent goal is accessible --------
drop policy if exists contrib_all on public.savings_contributions;
create policy contrib_all on public.savings_contributions
  for all using (
    exists (
      select 1 from public.savings_goals g
      where g.id = goal_id
        and (g.owner = auth.uid()
             or (g.scope = 'shared' and g.household_id = public.current_household_id()))
    )
  )
  with check (
    exists (
      select 1 from public.savings_goals g
      where g.id = goal_id
        and (g.owner = auth.uid()
             or (g.scope = 'shared' and g.household_id = public.current_household_id()))
    )
  );

-- ============================================================================
--  Grants
-- ============================================================================
grant select, insert, update, delete on public.incomes         to authenticated;
grant select, insert, update, delete on public.recurring_bills to authenticated;
