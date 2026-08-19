-- Log of pushes already sent for a de-duplicated key, so the hourly
-- send-reminders run can check "have I told this person about this bill
-- already?" instead of pushing the same thing every hour it stays due.
--
-- Only the Edge Function (service-role key, bypasses RLS entirely) ever
-- writes here — the select policy exists purely so a signed-in user could
-- see their own notification history if that's ever surfaced in the UI.
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  unique (owner, key)
);
alter table public.notification_log enable row level security;
drop policy if exists notification_log_select on public.notification_log;
create policy notification_log_select on public.notification_log
  for select using (owner = auth.uid());
