-- 0004 — An optional spending target per trip, for Budget mode (Sprint 6).
-- The Budget tab reads spend from the cost on each event; this adds the one
-- number the couple sets by hand — the target to weigh that spend against.
-- Stored in the trip's own `currency`. Nullable = no target set yet.

alter table public.trips
  add column budget numeric check (budget is null or budget >= 0);
