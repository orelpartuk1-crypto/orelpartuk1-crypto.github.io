-- ============================================================================
--  Duo Budget — Schema upgrade v14  (real push notifications)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ----------------------------------------------------------------------------
--  A device's Web Push subscription (one row per device the user enabled
--  reminders on). Written by the client (owner = auth.uid()), read by the
--  scheduled Netlify function using the SERVICE ROLE key (bypasses RLS).
-- ============================================================================
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_all on public.push_subscriptions;
create policy push_subscriptions_all on public.push_subscriptions for all
  using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Reminder time: hour of day (0-23, Europe/Madrid local time) to send the
-- daily "log today's spending" push. NULL = reminders off.
alter table public.user_private
  add column if not exists reminder_hour smallint check (reminder_hour between 0 and 23);

notify pgrst, 'reload schema';
