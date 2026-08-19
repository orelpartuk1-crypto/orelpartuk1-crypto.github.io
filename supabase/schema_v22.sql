-- Mutual fund tracking (Fondos de inversión): a second asset_type alongside
-- the existing stock/ETF tickers, identified by ISIN instead of a ticker,
-- because a fund's price (NAV, Net Asset Value) isn't queryable by ISIN
-- directly — it has to be resolved to Yahoo's internal fund symbol first
-- (format like "0P00000G12.F"), which is cached in yahoo_symbol so that
-- resolution — a slower search call — only happens once per fund, not on
-- every price refresh.
--
-- `units`/`unit_price` are already unconstrained `numeric` (no precision or
-- scale set) — they already round-trip 5+ decimal places with zero loss, so
-- fractional fund units need no schema change at all. Verified directly:
-- `select 6.23451::numeric` round-trips exactly.
alter table public.holdings add column if not exists asset_type text not null default 'stock' check (asset_type in ('stock', 'fund'));
alter table public.holdings add column if not exists isin text;
alter table public.holdings add column if not exists yahoo_symbol text;
-- Total Invested Amount — the cost basis a PnL figure is measured against.
-- Not fund-exclusive: any tracked holding can carry one.
alter table public.holdings add column if not exists cost_basis numeric(14,2);

create index if not exists holdings_isin_idx on public.holdings (isin) where isin is not null;
