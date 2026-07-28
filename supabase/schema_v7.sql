-- ============================================================================
--  Duo Budget — Schema upgrade v7
--  Treat spending as a % of each person's salary — computed server-side so the
--  actual income is never exposed (only the resulting percentage is returned).
--  Run in Supabase -> SQL Editor -> New query -> Run.
-- ============================================================================

create or replace function public.treat_income_pct(p_month date)
returns table(member_id uuid, pct numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  hh uuid;
  m  date := date_trunc('month', p_month)::date;
begin
  select household_id into hh from public.profiles where id = auth.uid();
  if hh is null then return; end if;

  return query
  select p.id,
         case when a.inc > 0 then b.treat / a.inc else 0 end
  from public.profiles p
  cross join lateral (
    select coalesce((select up.monthly_income from public.user_private up where up.owner = p.id), 0)
         + coalesce((select sum(i.amount) from public.incomes i where i.owner = p.id and i.month = m), 0) as inc
  ) a
  cross join lateral (
    select coalesce((
      select sum(e.amount) from public.expenses e
      where e.paid_by = p.id and e.scope = 'shared' and e.spend_type = 'treat'
        and date_trunc('month', e.spent_at)::date = m
    ), 0) as treat
  ) b
  where p.household_id = hh;
end;
$$;

grant execute on function public.treat_income_pct(date) to authenticated;
