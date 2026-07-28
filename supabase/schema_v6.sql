-- ============================================================================
--  Duo Budget — Schema upgrade v6  (recurring expenses + recurring income)
--  Additive + idempotent. Run in Supabase -> SQL Editor -> New query -> Run.
-- ============================================================================

-- Definitions of things that repeat every month (Netflix, gym, money from mom…)
create table if not exists public.recurring (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner        uuid not null references public.profiles(id) on delete cascade,
  kind         text not null check (kind in ('expense','income')),
  name         text not null,
  amount       numeric(10,2) not null check (amount > 0),
  category     text,            -- expense only
  scope        text,            -- expense only: private/shared/business
  spend_type   text,            -- expense only: need/treat
  source       text,            -- income only
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Link generated rows back to their definition (prevents duplicates per month)
alter table public.expenses add column if not exists recurring_id uuid;
alter table public.incomes  add column if not exists recurring_id uuid;

alter table public.recurring enable row level security;
drop policy if exists recurring_all on public.recurring;
create policy recurring_all on public.recurring for all
  using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.recurring to authenticated;

-- ---------- Materialize this month's recurring items --------------------------
-- Inserts a row for each of the caller's active recurring items if one does not
-- already exist for the given month. Safe to call repeatedly.
create or replace function public.materialize_recurring(p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r  record;
  m  date := date_trunc('month', p_month)::date;
  hh uuid;
begin
  select household_id into hh from public.profiles where id = auth.uid();
  if hh is null then return; end if;

  for r in select * from public.recurring where owner = auth.uid() and active loop
    if r.kind = 'expense' then
      if not exists (
        select 1 from public.expenses e
        where e.recurring_id = r.id and date_trunc('month', e.spent_at)::date = m
      ) then
        insert into public.expenses (household_id, paid_by, amount, category, kind, scope, spend_type, note, spent_at, recurring_id)
        values (hh, auth.uid(), r.amount, coalesce(r.category, 'Other'), 'shared',
                coalesce(r.scope, 'private'), coalesce(r.spend_type, 'need'), r.name, m, r.id);
      end if;
    elsif r.kind = 'income' then
      if not exists (
        select 1 from public.incomes i where i.recurring_id = r.id and i.month = m
      ) then
        insert into public.incomes (household_id, owner, kind, bonus_type, amount, month, note, recurring_id)
        values (hh, auth.uid(), 'bonus', coalesce(r.source, r.name), r.amount, m, r.name, r.id);
      end if;
    end if;
  end loop;
end;
$$;

grant execute on function public.materialize_recurring(date) to authenticated;
