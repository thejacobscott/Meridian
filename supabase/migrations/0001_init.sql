-- Meridian — initial schema, RLS, and helpers (§4).
-- A "space" is the shared two-person container. Everything else hangs off it.
-- Run this in the Supabase SQL editor (or `supabase db push`).

-- The membership helpers below are LANGUAGE sql, whose bodies Postgres checks at
-- creation time — but they reference tables defined later in this same file.
-- Defer that body check to runtime so the forward references resolve cleanly.
-- Scoped to this script/transaction; the setting reverts afterward.
set check_function_bodies = off;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER so RLS predicates don't recurse).
-- ---------------------------------------------------------------------------
create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.space_id = p_space_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    join public.members m on m.space_id = t.space_id
    where t.id = p_trip_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Us',
  home_tz_a   text,
  home_tz_b   text,
  invite_code text not null unique
              default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at  timestamptz not null default now()
);

create table public.members (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references public.spaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  home_city    text,
  created_at   timestamptz not null default now(),
  unique (space_id, user_id)
);
create index members_space_idx on public.members(space_id);
create index members_user_idx on public.members(user_id);

create table public.trips (
  id              uuid primary key default gen_random_uuid(),
  space_id        uuid not null references public.spaces(id) on delete cascade,
  title           text not null,
  destination     text,
  start_date      date,
  end_date        date,
  status          text not null default 'dreaming'
                  check (status in ('dreaming', 'upcoming', 'active', 'past')),
  accent_color    text,
  cover_photo_url text,
  currency        text not null default 'USD',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index trips_space_idx on public.trips(space_id);

create table public.days (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  date         date not null,
  summary_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (trip_id, date)
);
create index days_trip_idx on public.days(trip_id);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid references public.spaces(id) on delete cascade,
  name       text not null,
  color      text not null default '#6B655C',
  icon       text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index categories_space_idx on public.categories(space_id);

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  day_id        uuid references public.days(id) on delete set null,
  title         text not null,
  category_id   uuid references public.categories(id) on delete set null,
  start_time    time,
  end_time      time,
  location_name text,
  lat           double precision,
  lng           double precision,
  notes         text,
  cost          numeric(12, 2),
  currency      text,
  booking_ref   text,
  status        text not null default 'idea'
                check (status in ('idea', 'planned', 'booked', 'done')),
  sort_order    integer not null default 0,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index events_trip_idx on public.events(trip_id);
create index events_day_idx on public.events(day_id);

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  day_id       uuid references public.days(id) on delete set null,
  event_id     uuid references public.events(id) on delete set null,
  storage_path text not null,
  caption      text,
  taken_at     timestamptz,
  uploaded_by  uuid references auth.users(id) on delete set null,
  is_favorite  boolean not null default false,
  created_at   timestamptz not null default now()
);
create index photos_trip_idx on public.photos(trip_id);
create index photos_day_idx on public.photos(day_id);

create table public.wishlist_items (
  id                  uuid primary key default gen_random_uuid(),
  space_id            uuid not null references public.spaces(id) on delete cascade,
  title               text not null,
  place               text,
  note                text,
  added_by            uuid references auth.users(id) on delete set null,
  votes_a             integer not null default 0,
  votes_b             integer not null default 0,
  promoted_to_trip_id uuid references public.trips(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index wishlist_space_idx on public.wishlist_items(space_id);

create table public.packing_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  label      text not null,
  qty        integer not null default 1,
  owner      text not null default 'shared' check (owner in ('a', 'b', 'shared')),
  is_packed  boolean not null default false,
  created_at timestamptz not null default now()
);
create index packing_trip_idx on public.packing_items(trip_id);

create table public.reactions (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  target_type text not null check (target_type in ('event', 'photo', 'day', 'trip')),
  target_id   uuid not null,
  member_id   uuid not null references public.members(id) on delete cascade,
  emoji       text,
  note        text,
  created_at  timestamptz not null default now()
);
create index reactions_target_idx on public.reactions(target_type, target_id);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  target_type text not null check (target_type in ('event', 'photo', 'day', 'trip')),
  target_id   uuid not null,
  member_id   uuid not null references public.members(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index comments_target_idx on public.comments(target_type, target_id);

-- updated_at triggers
create trigger trg_trips_updated before update on public.trips
  for each row execute function public.set_updated_at();
create trigger trg_days_updated before update on public.days
  for each row execute function public.set_updated_at();
create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();
create trigger trg_wishlist_updated before update on public.wishlist_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Exactly-two-members guard + membership functions
-- ---------------------------------------------------------------------------
create or replace function public.enforce_two_members()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.members where space_id = new.space_id) >= 2 then
    raise exception 'A space can have at most two members';
  end if;
  return new;
end;
$$;
create trigger trg_two_members before insert on public.members
  for each row execute function public.enforce_two_members();

create or replace function public.create_space(
  p_name text, p_display_name text, p_home_city text, p_home_tz text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_space_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.spaces (name, home_tz_a)
    values (coalesce(nullif(trim(p_name), ''), 'Us'), p_home_tz)
    returning id into v_space_id;
  insert into public.members (space_id, user_id, display_name, home_city)
    values (v_space_id, auth.uid(), nullif(trim(p_display_name), ''), nullif(trim(p_home_city), ''));
  return v_space_id;
end;
$$;

create or replace function public.join_space(
  p_invite_code text, p_display_name text, p_home_city text, p_home_tz text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_space_id uuid; v_count int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id into v_space_id from public.spaces
    where invite_code = upper(trim(p_invite_code));
  if v_space_id is null then raise exception 'Invalid invite code'; end if;
  if exists (select 1 from public.members where space_id = v_space_id and user_id = auth.uid())
    then return v_space_id; end if;
  select count(*) into v_count from public.members where space_id = v_space_id;
  if v_count >= 2 then raise exception 'This space is already full'; end if;
  insert into public.members (space_id, user_id, display_name, home_city)
    values (v_space_id, auth.uid(), nullif(trim(p_display_name), ''), nullif(trim(p_home_city), ''));
  update public.spaces set home_tz_b = p_home_tz where id = v_space_id;
  return v_space_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — a space's data is visible only to its two members.
-- ---------------------------------------------------------------------------
alter table public.spaces enable row level security;
alter table public.members enable row level security;
alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.packing_items enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;

-- spaces: members read/update/delete; creation is via create_space()
create policy spaces_select on public.spaces for select
  using (public.is_space_member(id));
create policy spaces_update on public.spaces for update
  using (public.is_space_member(id)) with check (public.is_space_member(id));
create policy spaces_delete on public.spaces for delete
  using (public.is_space_member(id));

-- members: visible to space members; you may edit/leave only your own row.
create policy members_select on public.members for select
  using (public.is_space_member(space_id));
create policy members_update on public.members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_delete on public.members for delete
  using (user_id = auth.uid());

-- trips
create policy trips_all on public.trips for all
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

-- trip-scoped children
create policy days_all on public.days for all
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
create policy events_all on public.events for all
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
create policy photos_all on public.photos for all
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
create policy packing_all on public.packing_items for all
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- categories: global defaults are readable by everyone; custom ones are per-space.
create policy categories_select on public.categories for select
  using (space_id is null or public.is_space_member(space_id));
create policy categories_write on public.categories for all
  using (space_id is not null and public.is_space_member(space_id))
  with check (space_id is not null and public.is_space_member(space_id));

-- space-scoped social tables
create policy wishlist_all on public.wishlist_items for all
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));
create policy reactions_all on public.reactions for all
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));
create policy comments_all on public.comments for all
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

-- ---------------------------------------------------------------------------
-- Default categories (§4). Global rows shared by every space.
-- ---------------------------------------------------------------------------
insert into public.categories (name, color, icon, is_default, space_id) values
  ('Food',            '#C2664A', 'utensils',     true, null),
  ('Bars & Nightlife','#7C5CBF', 'wine',         true, null),
  ('Culture',         '#B98A3C', 'landmark',     true, null),
  ('Outdoors',        '#6E8B5B', 'trees',        true, null),
  ('Sightseeing',     '#4A8FB0', 'camera',       true, null),
  ('Shopping',        '#C77FA6', 'shopping-bag', true, null),
  ('Relax',           '#8A9A7B', 'flower',       true, null),
  ('Romance',         '#C85C7E', 'heart',        true, null),
  ('Adventure',       '#D08B2C', 'mountain',     true, null),
  ('Travel',          '#6B655C', 'plane',        true, null);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for trip photos. Path convention: {space_id}/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('trip-photos', 'trip-photos', false)
  on conflict (id) do nothing;

create policy "photos read for space members" on storage.objects for select
  using (bucket_id = 'trip-photos'
         and public.is_space_member(((storage.foldername(name))[1])::uuid));
create policy "photos insert for space members" on storage.objects for insert
  with check (bucket_id = 'trip-photos'
              and public.is_space_member(((storage.foldername(name))[1])::uuid));
create policy "photos delete for space members" on storage.objects for delete
  using (bucket_id = 'trip-photos'
         and public.is_space_member(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes so the other side of the ocean sees edits.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.trips, public.days, public.events, public.photos,
  public.comments, public.reactions, public.wishlist_items,
  public.packing_items, public.members;
