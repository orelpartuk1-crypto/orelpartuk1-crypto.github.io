-- ============================================================================
--  Duo Budget — Schema upgrade v15  (schedule send-reminders via pg_cron)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl),
--  AFTER first running the two `vault.create_secret(...)` calls given
--  separately (NOT committed here — this repo is public, secrets never go
--  in a committed file, only referenced by name via Vault).
-- ----------------------------------------------------------------------------
--  Replaces Netlify's `netlify.toml` `[functions."send-reminders"] schedule
--  = "@hourly"` now that send-reminders lives at Supabase Edge Functions.
-- ============================================================================
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_service_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

notify pgrst, 'reload schema';
