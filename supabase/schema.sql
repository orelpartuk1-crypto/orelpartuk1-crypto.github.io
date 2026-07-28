-- ============================================================================
--  Duo Budget — Supabase schema
--  Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).
--  It is idempotent-ish: safe to re-run during setup.
-- ============================================================================

-- ---------- Extensions -------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------- Households -------------------------------------------------------
-- A "household" is the shared space that links two partners together.
create table if not exists public.households (
  id             uuid primary key default gen_random_uuid(),
  name           text not null default 'Our Household',
  monthly_budget numeric(10,2) not null default 0,       -- overall € budget/month
  invite_code    text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at     timestamptz not null default now()
);

-- ---------- Profiles ---------------------------------------------------------
-- One row per auth user. household_id is null until they create / join one.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  display_name text not null default 'Me',
  created_at   timestamptz not null default now()
);

-- ---------- Expenses ---------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  paid_by      uuid not null references public.profiles(id) on delete cascade,
  amount       numeric(10,2) not null check (amount > 0),
  category     text not null,
  kind         text not null default 'shared' check (kind in ('shared','personal')),
  note         text,
  spent_at     date not null default current_date,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_household_idx on public.expenses (household_id, spent_at desc);

-- ---------- Per-category budgets --------------------------------------------
create table if not exists public.category_budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  category      text not null,
  monthly_limit numeric(10,2) not null default 0,
  unique (household_id, category)
);

-- ---------- Personal savings goals (private per user) -----------------------
create table if not exists public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  target_amount numeric(10,2) not null check (target_amount > 0),
  created_at    timestamptz not null default now()
);

create table if not exists public.savings_contributions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.savings_goals(id) on delete cascade,
  amount     numeric(10,2) not null check (amount <> 0),
  note       text,
  created_at timestamptz not null default now()
);

-- ============================================================================
--  Helper: current user's household id (used by RLS policies)
-- ============================================================================
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- ============================================================================
--  New-user trigger: auto-create a profile row on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
--  RPC: create a household and join it (avoids RLS chicken-and-egg)
-- ============================================================================
create or replace function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  insert into public.households (name) values (coalesce(nullif(p_name,''),'Our Household'))
  returning * into h;
  update public.profiles set household_id = h.id where id = auth.uid();
  return h;
end;
$$;

-- RPC: join an existing household by its invite code
create or replace function public.join_household(p_code text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  select * into h from public.households where invite_code = upper(trim(p_code));
  if h.id is null then
    raise exception 'Invalid invite code';
  end if;
  update public.profiles set household_id = h.id where id = auth.uid();
  return h;
end;
$$;

-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table public.households           enable row level security;
alter table public.profiles             enable row level security;
alter table public.expenses             enable row level security;
alter table public.category_budgets     enable row level security;
alter table public.savings_goals        enable row level security;
alter table public.savings_contributions enable row level security;

-- Households: members can read & update their own household
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select using (id = public.current_household_id());
drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update using (id = public.current_household_id());

-- Profiles: read anyone in my household; write only my own row
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or household_id = public.current_household_id()
  );
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

-- Expenses: full CRUD for members of the household
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Category budgets: full CRUD for members
drop policy if exists cat_budgets_all on public.category_budgets;
create policy cat_budgets_all on public.category_budgets
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Savings goals: private to the owner
drop policy if exists goals_all on public.savings_goals;
create policy goals_all on public.savings_goals
  for all using (owner = auth.uid())
  with check (owner = auth.uid());

-- Savings contributions: private to the goal owner
drop policy if exists contrib_all on public.savings_contributions;
create policy contrib_all on public.savings_contributions
  for all using (
    exists (select 1 from public.savings_goals g where g.id = goal_id and g.owner = auth.uid())
  )
  with check (
    exists (select 1 from public.savings_goals g where g.id = goal_id and g.owner = auth.uid())
  );

-- ============================================================================
--  Grants (authenticated users use these tables/functions)
-- ============================================================================
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.current_household_id() to authenticated;
