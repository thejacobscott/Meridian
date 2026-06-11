-- Two flavors of someday on one board: a `place` (a trip you're dreaming of,
-- which can graduate into a real trip) and a `date` idea (something to do
-- together that lives as a shared, hearted list). Additive + idempotent; the
-- default is `place`, so every existing row keeps its current meaning and the
-- board renders it exactly as before until someone adds a date idea.
alter table public.wishlist_items
  add column if not exists kind text not null default 'place';

-- Keep the column honest — only the two kinds the UI knows about.
alter table public.wishlist_items
  drop constraint if exists wishlist_items_kind_check;
alter table public.wishlist_items
  add constraint wishlist_items_kind_check check (kind in ('place', 'date'));

-- wishlist_items is already in the supabase_realtime publication (migration
-- 0001), so a partner adding a date idea syncs across without further changes.
