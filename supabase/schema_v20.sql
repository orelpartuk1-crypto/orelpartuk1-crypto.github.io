-- Live market prices for investment holdings.
--
-- Until now a ticker typed in Wealth was stored in `note` as decoration: the
-- value on screen was whatever number you last typed by hand, so a portfolio
-- that had moved 8% still showed last month's figure. These columns let a
-- holding describe itself as "12 units of VUAA" and have the value follow the
-- market instead.
--
-- `value` stays the source of truth for everything without a ticker (a flat,
-- a car, cash under the mattress) and is also kept up to date for tracked
-- holdings, so every existing query that sums `value` keeps working untouched
-- and nothing has to know about prices.

alter table public.holdings add column if not exists ticker text;
alter table public.holdings add column if not exists units numeric;
alter table public.holdings add column if not exists unit_price numeric;
-- The currency the exchange quotes in, which is often NOT the currency you
-- think in: VUAA is a European ETF quoted in USD. Storing it is what makes the
-- conversion honest rather than a silent 1:1.
alter table public.holdings add column if not exists price_currency text;
alter table public.holdings add column if not exists priced_at timestamptz;

-- Only rows that name a ticker AND a number of units can be priced. A ticker
-- alone is still just a label, exactly as before.
create index if not exists holdings_ticker_idx on public.holdings (ticker) where ticker is not null;
