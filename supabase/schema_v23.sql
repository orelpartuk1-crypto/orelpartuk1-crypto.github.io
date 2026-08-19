-- Daily automatic price refresh for tracked holdings (stocks, ETFs, mutual
-- funds), independent of anyone opening the app. Same pg_cron + pg_net
-- pattern already proven by send-reminders-hourly (schema_v15).
--
-- 20:00 UTC = 22:00 CEST / 21:00 CET — comfortably after European markets
-- close and fund NAVs are finalized for the day, regardless of daylight
-- saving. The DB's own timezone is UTC (confirmed via `show timezone`),
-- which is what pg_cron's schedule is interpreted in.
select cron.schedule(
  'refresh-holdings-daily',
  '0 20 * * *',
  $$
  select net.http_post(
    url := 'https://bckxqcyyvhxlcfbyvgzl.supabase.co/functions/v1/refresh-holdings',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

notify pgrst, 'reload schema';
