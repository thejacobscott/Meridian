import type { PackOwner } from "@/lib/supabase/types";

export type { PackOwner };

/**
 * The app's view model for a packing-list item. Mirrors the `packing_items` row
 * (lib/supabase/types) one-to-one — `owner` is the same a/b/shared used across
 * the schema ("a" = you, "b" = your person, "shared" = between the two of you).
 * The future Supabase provider drops in behind the same store interface.
 */
export interface PackingItem {
  id: string;
  trip_id: string;
  label: string;
  qty: number;
  owner: PackOwner;
  is_packed: boolean;
  created_at: string;
}

/** What the quick-add hands to the store. */
export interface PackingDraft {
  label: string;
  qty?: number;
  owner?: PackOwner;
}

/** What a row's controls can patch. */
export interface PackingPatch {
  label?: string;
  qty?: number;
  owner?: PackOwner;
  is_packed?: boolean;
}

/** Display order of the owner sections (shared first — it's the "us" pile). */
export const PACK_OWNER_ORDER: PackOwner[] = ["shared", "a", "b"];

export interface PackingProgress {
  total: number;
  packed: number;
  remaining: number;
  /** 0..1 — share of items already packed. */
  ratio: number;
}

/** Roll a trip's items into the header's "x of y packed" + progress bar. Pure. */
export function packingProgress(items: PackingItem[]): PackingProgress {
  const total = items.length;
  const packed = items.reduce((n, i) => n + (i.is_packed ? 1 : 0), 0);
  return {
    total,
    packed,
    remaining: total - packed,
    ratio: total === 0 ? 0 : packed / total,
  };
}

/**
 * Within a section: still-to-pack first (by age), then packed items sink to the
 * bottom — a checklist that visibly empties as you go.
 */
export function sortPacking(items: PackingItem[]): PackingItem[] {
  return [...items].sort((a, b) => {
    if (a.is_packed !== b.is_packed) return a.is_packed ? 1 : -1;
    return a.created_at.localeCompare(b.created_at);
  });
}
