-- The "get to know you" intro questionnaire needs to know three things:
-- whether you've finished it, whether you've asked to be left alone for now,
-- and roughly what you think you spend a month (the one answer it collects
-- that has nowhere else to live — everything else it asks about goes into
-- accounts, holdings and recurring, which already exist).
--
-- Deliberately on user_private, not profiles: these are yours, not the
-- household's, and profiles is readable by your partner.
alter table public.user_private
  add column if not exists intro_done_at timestamptz,
  add column if not exists intro_snoozed_until timestamptz,
  add column if not exists monthly_spend_estimate numeric;
