import type { Trip } from "./types";

/**
 * Sample trips shown in design / preview mode (no Supabase keys). They give the
 * trips list an immediate, gorgeous first impression — one of each life stage:
 * a daydream, the next reunion, and a memory. Covers are gradient-only so the
 * preview never depends on the network. Real trips replace these once a space
 * is connected.
 */
export const SAMPLE_TRIPS: Trip[] = [
  {
    id: "sample-lisbon",
    title: "Lisbon, slowly",
    destination: "Lisbon, Portugal",
    start_date: "2026-06-21",
    end_date: "2026-06-28",
    status: "upcoming",
    status_override: false,
    accent_color: "#c2664a",
    cover_photo_url: null,
    currency: "EUR",
    budget: 2500,
    created_at: "2026-03-02T10:00:00.000Z",
  },
  {
    id: "sample-kyoto",
    title: "Kyoto in autumn",
    destination: "Kyoto, Japan",
    start_date: null,
    end_date: null,
    status: "dreaming",
    status_override: false,
    accent_color: "#8a9a7b",
    cover_photo_url: null,
    currency: "JPY",
    budget: null,
    created_at: "2026-01-18T09:00:00.000Z",
  },
  {
    id: "sample-amalfi",
    title: "The Amalfi week",
    destination: "Amalfi Coast, Italy",
    start_date: "2025-09-12",
    end_date: "2025-09-20",
    status: "past",
    status_override: false,
    accent_color: "#b98a3c",
    cover_photo_url: null,
    currency: "EUR",
    budget: 4000,
    created_at: "2025-05-04T08:00:00.000Z",
  },
];

/**
 * Sample trips carry a stable `sample-` id prefix; trips the couple create never
 * do (they get a UUID). That lets the UI label the demo trips and offer a clean
 * "start fresh" without a separate flag threaded through the store.
 */
export function isSampleTrip(trip: Pick<Trip, "id">): boolean {
  return trip.id.startsWith("sample-");
}
