import type { DayMemory } from "./types";

/**
 * Sample day-memories for the past "Amalfi week" trip (lib/trips/sample.ts), so
 * Memory mode opens with a lived-in scrapbook in preview — notes and ratings on
 * a handful of days, a few days left blank to show the gentle "add" affordance.
 * Photos can't be seeded (they're real binary in IndexedDB), so the couple's own
 * uploads fill those in. Dates line up with sample-amalfi (2025-09-12 → 20).
 */
export const SAMPLE_DAY_MEMORIES: DayMemory[] = [
  {
    trip_id: "sample-amalfi",
    date: "2025-09-12",
    note: "Drove the coast road white-knuckled and laughing. First spritz on the terrace just as the sun dropped behind Positano.",
    rating: 4,
    updated_at: "2025-09-12T21:00:00.000Z",
  },
  {
    trip_id: "sample-amalfi",
    date: "2025-09-13",
    note: "The boat day. Anchored off Capri, swam until our fingers pruned, ate lemon granita straight from the cup.",
    rating: 5,
    updated_at: "2025-09-13T20:30:00.000Z",
  },
  {
    trip_id: "sample-amalfi",
    date: "2025-09-15",
    note: "Ravello — all gardens and quiet. We barely spoke and it was perfect.",
    rating: 5,
    updated_at: "2025-09-15T19:45:00.000Z",
  },
  {
    trip_id: "sample-amalfi",
    date: "2025-09-17",
    note: "Rained all day. Stayed in, played cards, ordered too much pasta. Somehow one of the best afternoons of the trip.",
    rating: 4,
    updated_at: "2025-09-17T22:10:00.000Z",
  },
  {
    trip_id: "sample-amalfi",
    date: "2025-09-19",
    note: "Climbed the lemon-terrace steps and regretted it halfway, then didn't. Last long dinner, the good wine.",
    rating: 5,
    updated_at: "2025-09-19T18:20:00.000Z",
  },
];
