-- ============================================================================
--  Duo Budget — Schema upgrade v3  (business expenses, important dates)
--  Additive + idempotent. Run in Supabase -> SQL Editor -> New query -> Run.
-- ============================================================================

-- ---------- Expenses: allow a third scope, 'business' -------------------------
alter table public.expenses drop constraint if exists expenses_scope_check;
alter table public.expenses
  add constraint expenses_scope_check check (scope in ('private','shared','business'));

-- ---------- Business tax settings (private per user) --------------------------
-- Annual business revenue for the IRPF estimate (expenses come from logged rows).
create table if not exists public.tax_profile (
  owner              uuid primary key references public.profiles(id) on delete cascade,
  annual_income      numeric(12,2) not null default 0,   -- yearly business revenue
  extra_expenses     numeric(12,2) not null default 0,   -- deductibles not logged in app
  updated_at         timestamptz not null default now()
);

-- ---------- Important dates (private per user, with a budget) -----------------
create table if not exists public.important_dates (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  on_date    date not null,
  recurring  boolean not null default true,   -- repeats every year
  budget     numeric(10,2) not null default 0,
  note       text,
  created_at timestamptz not null default now()
);

-- ============================================================================
--  RLS — all private to the owner
-- ============================================================================
alter table public.tax_profile     enable row level security;
alter table public.important_dates enable row level security;

drop policy if exists tax_profile_all on public.tax_profile;
create policy tax_profile_all on public.tax_profile
  for all using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists dates_all on public.important_dates;
create policy dates_all on public.important_dates
  for all using (owner = auth.uid()) with check (owner = auth.uid());

grant select, insert, update, delete on public.tax_profile     to authenticated;
grant select, insert, update, delete on public.important_dates to authenticated;
