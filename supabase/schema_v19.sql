-- ============================================================================
--  Duo Budget — Schema upgrade v19  (server-side date defaults use local time)
--  Additive + idempotent. Run in Supabase -> SQL Editor -> New query -> Run.
--  Make sure you are in the duo-budget project (URL contains bckxqcyyvhxlcfbyvgzl).
-- ============================================================================

-- Supabase Postgres runs in UTC. quick_log (used by every Shortcuts/Siri quick
-- add, and about to carry the Apple Pay tap-to-log automation) dated every
-- entry with the server's current_date — so anything logged between 23:00 and
-- 01:00/02:00 local time (Madrid is UTC+1 in winter, UTC+2 in summer) landed on
-- the wrong day, the same family of bug just fixed on the client with isoDay().
-- The column defaults on expenses.spent_at and incomes.month had the identical
-- mistake; fixed here too even though the app itself always sends an explicit
-- date, since a future direct insert would otherwise hit it again.
alter table public.expenses
  alter column spent_at set default ((now() at time zone 'Europe/Madrid')::date);

alter table public.incomes
  alter column month set default (date_trunc('month', (now() at time zone 'Europe/Madrid')::date)::date);

create or replace function public.quick_log(
  p_key        text,
  p_amount     numeric,
  p_category   text default 'Other',
  p_scope      text default 'private',
  p_spend_type text default 'need',
  p_note       text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  hh  uuid;
  sc  text := coalesce(p_scope, 'private');
  today date := (now() at time zone 'Europe/Madrid')::date;
begin
  select owner into uid from public.user_private where quick_key = p_key;
  if uid is null then raise exception 'invalid key'; end if;
  select household_id into hh from public.profiles where id = uid;
  if hh is null then raise exception 'no household'; end if;
  if sc not in ('private', 'shared', 'business') then sc := 'private'; end if;

  -- kind derivation carried over from schema_v13 — do not hardcode 'shared'.
  insert into public.expenses (household_id, paid_by, amount, category, kind, scope, spend_type, note, spent_at)
  values (hh, uid, p_amount, coalesce(p_category, 'Other'),
          case when sc = 'private' then 'personal' else 'shared' end,
          sc, coalesce(p_spend_type, 'need'), p_note, today);
  return 'ok';
end;
$$;

grant execute on function public.quick_log(text, numeric, text, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
