import type { HubNote } from "./types";

/**
 * Sample hub timeline for preview mode (no Supabase keys). A mix of written
 * notes and logged moments, attributed to both sides, recent enough that the
 * relative times read naturally. Replaced once a space connects. (In preview,
 * a note written on the welcome screen is prepended ahead of these on first run.)
 */
export const SAMPLE_HUB: HubNote[] = [
  {
    id: "hub-note-countdown",
    kind: "note",
    body: "Counting down already. Three weeks feels like nothing now.",
    author: "b",
    created_at: "2026-06-09T20:10:00.000Z",
  },
  {
    id: "hub-note-dog",
    kind: "note",
    body: "Saw a dog today that looked exactly like Mr. Bean. Cried a little.",
    author: "a",
    created_at: "2026-06-09T14:02:00.000Z",
  },
  {
    id: "hub-miss-1",
    kind: "miss",
    body: null,
    author: "b",
    created_at: "2026-06-08T22:45:00.000Z",
  },
  {
    id: "hub-facetime-1",
    kind: "facetime",
    body: null,
    author: "a",
    created_at: "2026-06-08T21:30:00.000Z",
  },
  {
    id: "hub-note-call",
    kind: "note",
    body: "Booked the morning off for our call on Sunday. Coffee's on me.",
    author: "a",
    created_at: "2026-06-07T09:15:00.000Z",
  },
  {
    id: "hub-meal-1",
    kind: "meal",
    body: null,
    author: "b",
    created_at: "2026-06-06T19:00:00.000Z",
  },
];
