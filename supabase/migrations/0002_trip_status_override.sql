-- 0002 — Manual status override for trips.
-- A trip's status is normally derived from its dates (dreaming → upcoming →
-- active → past). The trips UI also lets either of us pin a status by hand;
-- this flag records that intent so a manual choice survives reloads and syncs
-- between the two of us. Default false = follow the dates.

alter table public.trips
  add column status_override boolean not null default false;
