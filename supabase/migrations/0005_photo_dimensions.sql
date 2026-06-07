-- 0005 — Photo dimensions + manual order, so the live backend mirrors what the
-- preview (IndexedDB) scrapbook already carries. `width`/`height` are the image's
-- intrinsic pixels: the photo book reserves each frame's aspect ratio from them
-- so a print never reflows (components/book/trip-book.tsx). `sort_order` is the
-- manual within-day order; ties fall back to created_at.

alter table public.photos
  add column if not exists width      integer,
  add column if not exists height     integer,
  add column if not exists sort_order integer not null default 0;

create index if not exists photos_sort_idx on public.photos(day_id, sort_order);
