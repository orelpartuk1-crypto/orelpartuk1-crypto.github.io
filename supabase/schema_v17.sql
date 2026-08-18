-- Security fix: profiles_update had no WITH CHECK, so Postgres reused its
-- USING clause (id = auth.uid()) as the post-update check too — which says
-- nothing about household_id. Any authenticated user could run
--   update profiles set household_id = '<any household uuid>' where id = auth.uid()
-- directly against the REST API (no app UI, no invite code, no join_household()
-- call) and current_household_id() would then treat them as a real member of
-- that household everywhere else in the schema checks it: shared expenses,
-- category_budgets, recurring_bills, shared savings_goals/contributions, the
-- households row itself, and shared-expense receipts in storage.
--
-- Fix: household_id may only stay the same (NULL stays NULL, or an existing
-- value stays that value) on a direct UPDATE. Changing it for real still
-- works exactly as before, through create_household()/join_household() —
-- both are SECURITY DEFINER and bypass RLS on the tables they write to.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and household_id is not distinct from (
      select p.household_id from public.profiles p where p.id = auth.uid()
    )
  );
