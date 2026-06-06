import { parseISO } from "date-fns";
import { toISODate } from "@/lib/itinerary/types";
import type { Trip } from "@/lib/trips/types";
import type { DayMemory } from "./types";

/**
 * A past day that lands on today's date — the "on this day" memory. Carries the
 * trip it belongs to, the matched day, how many years back it was, and whatever
 * note/rating was written for that day (if any).
 */
export interface OnThisDayHit {
  trip: Trip;
  /** The matched date within the trip (YYYY-MM-DD) — same month/day as today. */
  date: string;
  /** Whole years between that date and today (always >= 1). */
  yearsAgo: number;
  note: string | null;
  rating: number | null;
}

function parseValid(d: string | null): Date | null {
  if (!d) return null;
  const p = parseISO(d);
  return Number.isNaN(p.getTime()) ? null : p;
}

/**
 * Find a past trip that was underway on this calendar day (month + day) in an
 * earlier year — the gentle "one year ago today, you were in…" surface for
 * Home. Walks each trip's span (a handful of days) for a date matching today's
 * month/day in a prior year, prefers the most recent anniversary, and within a
 * tie prefers a day that carries a written memory. Returns null when nothing
 * lines up — which is most days, so the surface simply self-hides.
 *
 * Pure and date-injectable so it's trivially testable.
 */
export function findOnThisDay(
  trips: Trip[],
  getTripDays: (tripId: string) => DayMemory[],
  now: Date = new Date(),
): OnThisDayHit | null {
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const todayYear = now.getFullYear();

  let best: OnThisDayHit | null = null;

  for (const trip of trips) {
    const start = parseValid(trip.start_date);
    if (!start) continue;
    const end = parseValid(trip.end_date) ?? start;

    // Walk the trip day by day looking for today's month/day. Spans are short;
    // a counter guards against any pathological start/end ordering.
    const cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let match: Date | null = null;
    for (let guard = 0; cursor <= last && guard < 400; guard++) {
      if (cursor.getMonth() === todayMonth && cursor.getDate() === todayDate) {
        match = new Date(cursor);
        break;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (!match) continue;

    const yearsAgo = todayYear - match.getFullYear();
    if (yearsAgo < 1) continue; // only memories from a previous year

    const iso = toISODate(match);
    const mem = getTripDays(trip.id).find((d) => d.date === iso) ?? null;
    const hit: OnThisDayHit = {
      trip,
      date: iso,
      yearsAgo,
      note: mem?.note ?? null,
      rating: mem?.rating ?? null,
    };

    const better =
      !best ||
      hit.yearsAgo < best.yearsAgo ||
      (hit.yearsAgo === best.yearsAgo && !!hit.note && !best.note);
    if (better) best = hit;
  }

  return best;
}

const SMALL_NUMBERS = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

/** "One year ago today", "Two years ago today", … — the card's quiet eyebrow. */
export function yearsAgoLabel(yearsAgo: number): string {
  const n = SMALL_NUMBERS[yearsAgo] ?? String(yearsAgo);
  const unit = yearsAgo === 1 ? "year" : "years";
  return `${n} ${unit} ago today`;
}
