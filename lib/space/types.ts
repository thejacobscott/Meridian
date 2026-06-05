/**
 * The couple's shared "space": two people, each with a home city + IANA
 * timezone. Slot "a" is *you* on this device, "b" is your person — the same a/b
 * that maps to `spaces.home_tz_a/b`, `members`, and wishlist `votes_a/votes_b`
 * in the schema (lib/supabase/types). In preview this lives in localStorage
 * (see store.tsx); the Supabase-backed version reads the real space + members.
 */
export type MemberSlot = "a" | "b";

export interface SpaceMember {
  slot: MemberSlot;
  name: string;
  city: string | null;
  /** IANA timezone, e.g. "America/New_York". */
  tz: string;
}

export interface SpaceState {
  /** What the couple calls their space (shown on the profile). */
  name: string;
  /** Tuple is always [you (a), partner (b)]. */
  members: [SpaceMember, SpaceMember];
}

export interface MemberPatch {
  name?: string;
  city?: string | null;
  tz?: string;
}

/** Safe fallback when Intl can't resolve a zone. */
export const FALLBACK_TZ = "UTC";

/**
 * Static, SSR-deterministic seed so the first paint never depends on the
 * device clock or locale (which would risk a hydration mismatch). These are
 * obvious placeholders the couple edits on the profile; the classic NY↔London
 * pair gives the clocks a real five-hour offset to show off out of the box.
 */
export const DEFAULT_SPACE: SpaceState = {
  name: "Us",
  members: [
    { slot: "a", name: "You", city: "New York", tz: "America/New_York" },
    { slot: "b", name: "Your person", city: "London", tz: "Europe/London" },
  ],
};

/** First name only, for compact labels (heart chips, clock headings). */
export function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}
