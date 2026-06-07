-- Per-member waking hours (minutes from local midnight), powering "a good time
-- to call". Replaces a single hardcoded 8a–11p window with each person's own.
-- Additive + idempotent; the defaults match the previous constants, so existing
-- rows and behavior are unchanged until someone edits their hours.
alter table public.members
  add column if not exists wake_start smallint not null default 480,   -- 8:00 AM
  add column if not exists wake_end   smallint not null default 1380;  -- 11:00 PM

-- members is already in the supabase_realtime publication (migration 0001), so a
-- partner's edit syncs across without further changes.
