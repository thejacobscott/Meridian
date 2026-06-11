-- The connection hub: a shared, space-scoped timeline of little things between
-- visits — written notes plus logged moments ("I miss you", a FaceTime, a meal
-- shared over video). Append-mostly (no updated_at); the kinds are an open-ish
-- list so the trackers can grow. Mirrors the wishlist's space-scoping, RLS, and
-- realtime so a partner's note shows up on the other side of the ocean live.
-- Additive + idempotent.
create table if not exists public.hub_notes (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces(id) on delete cascade,
  author     uuid references auth.users(id) on delete set null,
  kind       text not null default 'note'
               check (kind in ('note', 'miss', 'facetime', 'meal')),
  body       text,
  created_at timestamptz not null default now()
);
create index if not exists hub_notes_space_idx on public.hub_notes(space_id);

alter table public.hub_notes enable row level security;

-- Space members read and write the whole hub; writes are attributed by author.
drop policy if exists hub_notes_all on public.hub_notes;
create policy hub_notes_all on public.hub_notes for all
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

-- Realtime: broadcast row changes so the other side sees notes the moment they
-- land. Guarded so re-running the migration doesn't error on a dup add.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'hub_notes'
  ) then
    alter publication supabase_realtime add table public.hub_notes;
  end if;
end $$;
