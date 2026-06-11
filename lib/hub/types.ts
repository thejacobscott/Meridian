import type { MemberSlot } from "@/lib/space/types";

/**
 * The little things you keep in the hub between visits: a written `note`, or a
 * logged moment — an "I miss you", a FaceTime, a meal shared over video. The
 * moment kinds are deliberately a short, open list so more can be added later
 * (the trackers are meant to grow).
 */
export type HubKind = "note" | "miss" | "facetime" | "meal";

/** Every kind except a written note — the tap-to-log moments. */
export type HubMoment = Exclude<HubKind, "note">;
export const HUB_MOMENTS: readonly HubMoment[] = ["miss", "facetime", "meal"];

/**
 * One entry in the shared hub timeline. Mirrors the `hub_notes` row: `body` is
 * the text of a note (null for a logged moment); `author` is resolved from the
 * writer's user id to their a/b slot — same as the wishlist — so the timeline
 * can color and name each entry.
 */
export interface HubNote {
  id: string;
  kind: HubKind;
  body: string | null;
  author: MemberSlot | null;
  created_at: string;
}

export interface HubDraft {
  kind?: HubKind;
  body?: string | null;
}

/** How many entries of a given kind — powers the little tracker counts. */
export function countKind(notes: HubNote[], kind: HubKind): number {
  let n = 0;
  for (const it of notes) if (it.kind === kind) n += 1;
  return n;
}

/** Newest first — the timeline order. */
export function sortHub(notes: HubNote[]): HubNote[] {
  return [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
