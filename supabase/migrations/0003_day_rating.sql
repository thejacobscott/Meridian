-- 0003 — A 1–5 rating for each day, for Memory mode (Sprint 4).
-- The scrapbook lets either of us look back on a day and give it a gut-feel
-- star rating alongside the day's note. The note already lives on `days`
-- (summary_note); this adds the rating on the same row. Nullable = not rated.

alter table public.days
  add column rating smallint check (rating between 1 and 5);
