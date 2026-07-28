-- ============================================================================
--  Duo Budget — Schema upgrade v15  (schedule send-reminders via pg_cron)
--  Run in the DUO-BUDGET SQL editor (URL contains bckxqcyyvhxlcfbyvgzl).
-- ----------------------------------------------------------------------------
--  Replaces Netlify's `netlify.toml` `[functions."send-reminders"] schedule
--  = "@hourly"` now that send-reminders lives at Supabase Edge Functions.
--  No secret/service-role header needed: the function is deployed with
--  verify_jwt = false, and Supabase auto-injects SUPABASE_SERVICE_ROLE_KEY
--  into the function's own environment — confirmed empirically (a plain,
--  no-auth-header curl to the deployed function succeeded end-to-end).
-- ============================================================================
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://bckxqcyyvhxlcfbyvgzl.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

notify pgrst, 'reload schema';
