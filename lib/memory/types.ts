/**
 * View models for Memory mode (Sprint 4 — the scrapbook). Mirrors two DB shapes
 * behind a simpler client interface, exactly like the itinerary layer:
 *
 *  - `DayMemory` collapses a `days` row down to the two things the scrapbook
 *    cares about: the day's note (`summary_note`) and its 1–5 `rating`
 *    (migration 0003). Keyed by (trip, date); there's one per remembered day.
 *  - `PhotoRecord` mirrors a `photos` row. In preview mode the binary lives in
 *    IndexedDB (see lib/memory/idb.ts) and we carry a runtime object-`url`; the
 *    future Supabase provider swaps that for a signed URL off `storage_path`.
 */

export interface DayMemory {
  trip_id: string;
  date: string; // YYYY-MM-DD
  note: string | null;
  rating: number | null; // 1..5, or null = not rated
  updated_at: string;
}

/** Everything about a photo except where its bytes are. */
export interface PhotoMeta {
  id: string;
  trip_id: string;
  /** Which day it belongs to (YYYY-MM-DD). null = not sorted onto a day yet. */
  date: string | null;
  caption: string | null;
  is_favorite: boolean;
  /** Manual order within a day; ties break by created_at. */
  sort_order: number;
  mime: string;
  width: number;
  height: number;
  created_at: string;
}

/** As persisted in IndexedDB (preview backend) — carries the compressed bytes. */
export interface StoredPhoto extends PhotoMeta {
  blob: Blob;
}

/** As used by the UI — carries a runtime object URL instead of the raw blob. */
export interface PhotoRecord extends PhotoMeta {
  url: string;
}

/** Patch the photo viewer can apply (caption / favorite). */
export interface PhotoPatch {
  caption?: string | null;
  is_favorite?: boolean;
}

export const MAX_RATING = 5;

/** Display order of a day's photos: manual sort_order, then by age. */
export function byPhotoOrder(a: PhotoMeta, b: PhotoMeta): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at.localeCompare(b.created_at);
}

export interface MemorySummary {
  photoCount: number;
  favoriteCount: number;
  /** Distinct days carrying a note, a rating, or at least one photo. */
  daysWithContent: number;
  ratedCount: number;
  avgRating: number | null;
}

/** Roll a trip's day-notes + photos into the Memory tab's header line. Pure. */
export function summarizeTripMemory(
  days: DayMemory[],
  photos: PhotoRecord[],
): MemorySummary {
  const filled = new Set<string>();
  let ratingSum = 0;
  let ratedCount = 0;

  for (const d of days) {
    const hasNote = !!d.note && d.note.trim().length > 0;
    const hasRating = d.rating != null;
    if (hasNote || hasRating) filled.add(d.date);
    if (hasRating) {
      ratingSum += d.rating!;
      ratedCount += 1;
    }
  }
  for (const p of photos) {
    if (p.date) filled.add(p.date);
  }

  return {
    photoCount: photos.length,
    favoriteCount: photos.filter((p) => p.is_favorite).length,
    daysWithContent: filled.size,
    ratedCount,
    avgRating: ratedCount > 0 ? ratingSum / ratedCount : null,
  };
}
