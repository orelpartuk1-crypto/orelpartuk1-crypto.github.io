-- ============================================================================
--  Duo Budget — Schema upgrade v18  (recurring charges can no longer duplicate)
--  Additive + idempotent. Run in Supabase -> SQL Editor -> New query -> Run.
--  Make sure you are in the duo-budget project (URL contains bckxqcyyvhxlcfbyvgzl).
--
--  IMPORTANT: run the cleanup at the bottom of this file BEFORE the index, or
--  creating the index will fail on the rows that are already duplicated.
-- ============================================================================

-- ---------- 1. Clean up the duplicates that already exist --------------------
-- Keeps the first charge of each recurring item per month and removes the
-- extra copies. Run the SELECT first and read it; the DELETE is the same query.
--
--   with ranked as (
--     select id, recurring_id, spent_at, amount, note,
--            row_number() over (partition by recurring_id,
--                                            date_trunc('month', spent_at)
--                               order by created_at) as rn
--     from public.expenses
--     where recurring_id is not null
--   )
--   select * from ranked where rn > 1;
--
-- Then, once the list looks right:
--
--   with ranked as (
--     select id, row_number() over (partition by recurring_id,
--                                                date_trunc('month', spent_at)
--                                   order by created_at) as rn
--     from public.expenses
--     where recurring_id is not null
--   )
--   delete from public.expenses
--   where id in (select id from ranked where rn > 1);

-- ---------- 2. Make a second charge structurally impossible ------------------
-- The function checked for an existing row before inserting, but two calls
-- arriving together both passed that check before either had committed, so the
-- household got one charge per concurrent call. Only the database can settle
-- this; the check in application code never could.
create unique index if not exists expenses_recurring_month_uniq
  on public.expenses (recurring_id, (date_trunc('month', spent_at::timestamp)))
  where recurring_id is not null;

-- ---------- 3. Teach the generator to expect that index ----------------------
-- Same behaviour as before, except a losing race now ends in a swallowed
-- unique_violation instead of a duplicate charge.
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
        begin
          insert into public.expenses (household_id, paid_by, amount, category, kind, scope, spend_type, note, spent_at, recurring_id)
          values (hh, auth.uid(), r.amount, coalesce(r.category, 'Other'), 'shared',
                  coalesce(r.scope, 'private'), coalesce(r.spend_type, 'need'), r.name, m, r.id);
        exception when unique_violation then
          -- Another call got there first. That is the desired outcome.
          null;
        end;
      end if;
    elsif r.kind = 'income' then
      if not exists (
        select 1 from public.incomes i where i.recurring_id = r.id and i.month = m
      ) then
        begin
          insert into public.incomes (household_id, owner, kind, bonus_type, amount, month, note, recurring_id)
          values (hh, auth.uid(), 'bonus', coalesce(r.source, r.name), r.amount, m, r.name, r.id);
        exception when unique_violation then
          null;
        end;
      end if;
    end if;
  end loop;
end;
$$;

grant execute on function public.materialize_recurring(date) to authenticated;
