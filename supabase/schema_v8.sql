-- ============================================================================
--  Duo Budget — Schema upgrade v8  (Siri / Shortcut quick-log)
--  A per-user secret key + a function that logs an expense from that key alone,
--  so an iOS Shortcut can post an expense with no password. Idempotent.
--  Run in Supabase -> SQL Editor -> New query -> Run.
-- ============================================================================

-- Personal secret key for quick-logging (random, unique).
alter table public.user_private
  add column if not exists quick_key text unique default encode(gen_random_bytes(12), 'hex');
update public.user_private set quick_key = encode(gen_random_bytes(12), 'hex') where quick_key is null;

-- Log an expense using only the secret key (callable by anon via the shortcut).
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
begin
  select owner into uid from public.user_private where quick_key = p_key;
  if uid is null then raise exception 'invalid key'; end if;
  select household_id into hh from public.profiles where id = uid;
  if hh is null then raise exception 'no household'; end if;

  insert into public.expenses (household_id, paid_by, amount, category, kind, scope, spend_type, note, spent_at)
  values (hh, uid, p_amount, coalesce(p_category, 'Other'), 'shared',
          coalesce(p_scope, 'private'), coalesce(p_spend_type, 'need'), p_note, current_date);
  return 'ok';
end;
$$;

grant execute on function public.quick_log(text, numeric, text, text, text, text) to anon, authenticated;
