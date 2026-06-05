import type { MemberSlot } from "@/lib/space/types";

/**
 * A shared "someday" — a place or idea the couple wants to do together one day.
 * Mirrors the `wishlist_items` row (lib/supabase/types): two enthusiasm counts,
 * one per partner (`votes_a`/`votes_b`), and `promoted_to_trip_id` linking the
 * dream to the real trip it became — so the someday board and the trips list
 * are one continuous object, never split. In the UI a vote is a simple heart
 * toggle (0 or 1 per person); the count shape is kept for schema fidelity.
 */
export interface WishlistItem {
  id: string;
  title: string;
  place: string | null;
  note: string | null;
  added_by: MemberSlot | null;
  votes_a: number;
  votes_b: number;
  promoted_to_trip_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WishlistDraft {
  title: string;
  place?: string | null;
  note?: string | null;
  added_by?: MemberSlot | null;
}

export function wants(item: WishlistItem, slot: MemberSlot): boolean {
  return (slot === "a" ? item.votes_a : item.votes_b) > 0;
}

export function bothWant(item: WishlistItem): boolean {
  return item.votes_a > 0 && item.votes_b > 0;
}

/** How many of the two have hearted it (0–2). */
export function voteCount(item: WishlistItem): number {
  return (item.votes_a > 0 ? 1 : 0) + (item.votes_b > 0 ? 1 : 0);
}

export function isPromoted(item: WishlistItem): boolean {
  return item.promoted_to_trip_id != null;
}

/**
 * Board order: living dreams first — the ones you both want, then a single
 * heart, then the not-yet-loved — newest within each tier; anything already
 * turned into a trip sinks to the bottom (it lives on the trips list now).
 */
export function sortWishlist(items: WishlistItem[]): WishlistItem[] {
  return [...items].sort((a, b) => {
    const ap = isPromoted(a) ? 1 : 0;
    const bp = isPromoted(b) ? 1 : 0;
    if (ap !== bp) return ap - bp;
    if (voteCount(a) !== voteCount(b)) return voteCount(b) - voteCount(a);
    return b.created_at.localeCompare(a.created_at);
  });
}
