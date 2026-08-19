-- Which day of the month a recurring item actually lands. Until now
-- upcomingPayments treated every recurring charge as due on the 1st, because
-- there was nowhere to record anything else — so "Coming up" told you rent and
-- your salary both arrive on the 1st regardless of the truth.
--
-- Nullable on purpose: existing rows keep behaving exactly as before (the
-- reader falls back to 1), and a day only appears once someone sets one.
alter table public.recurring
  add column if not exists day_of_month smallint
    check (day_of_month is null or (day_of_month between 1 and 31));
