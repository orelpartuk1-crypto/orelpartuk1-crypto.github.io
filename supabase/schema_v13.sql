-- ============================================================================
--  Duo Budget — Schema upgrade v13  (quick_log: fix kind, allow owed_amount)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ----------------------------------------------------------------------------
--  Bug: quick_log (Siri/Shortcuts quick-add) always inserted kind='shared',
--  even for private/business expenses — this threw off the shared/personal
--  split used by the Trends chart (useTrends.js). Fixed to derive kind from
--  the chosen scope, same rule the original v2 migration used.
-- ============================================================================
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
begin
  select owner into uid from public.user_private where quick_key = p_key;
  if uid is null then raise exception 'invalid key'; end if;
  select household_id into hh from public.profiles where id = uid;
  if hh is null then raise exception 'no household'; end if;
  if sc not in ('private', 'shared', 'business') then sc := 'private'; end if;

  insert into public.expenses (household_id, paid_by, amount, category, kind, scope, spend_type, note, spent_at)
  values (hh, uid, p_amount, coalesce(p_category, 'Other'),
          case when sc = 'private' then 'personal' else 'shared' end,
          sc, coalesce(p_spend_type, 'need'), p_note, current_date);
  return 'ok';
end;
$$;

grant execute on function public.quick_log(text, numeric, text, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
