import {
  differenceInCalendarDays,
  format,
  isSameMonth,
  isSameYear,
  parseISO,
} from "date-fns";
import type { TripStatus } from "@/lib/supabase/types";

export type { TripStatus };

/**
 * The app's view model for a trip. Mirrors the `trips` row (lib/supabase/types)
 * but is the shape the client store and UI work with. `status_override` marks a
 * trip whose status was set by hand; otherwise status is derived from the dates.
 */
export type Trip = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  status: TripStatus;
  status_override: boolean;
  accent_color: string;
  cover_photo_url: string | null;
  currency: string;
  /** Optional spending target for the trip, in `currency`. Null = none set. */
  budget: number | null;
  created_at: string;
};

/** What the create/edit form hands to the store. `status: null` means "auto". */
export type TripDraft = {
  title: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currency?: string;
  budget?: number | null;
  accent_color?: string;
  status?: TripStatus | null;
  cover_photo_url?: string | null;
};

export const TRIP_STATUSES: TripStatus[] = [
  "dreaming",
  "upcoming",
  "active",
  "past",
];

function safeParse(d: string | null): Date | null {
  if (!d) return null;
  const parsed = parseISO(d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Derive the status from dates (§Sprint 1: dreaming → upcoming → active → past).
 * No start date at all = still a daydream.
 */
export function deriveStatus(
  start: string | null,
  end: string | null,
  now: Date = new Date(),
): TripStatus {
  const s = safeParse(start);
  if (!s) return "dreaming";
  const e = safeParse(end) ?? s;
  const today = differenceInCalendarDays;
  if (today(s, now) > 0) return "upcoming"; // starts in the future
  if (today(now, e) > 0) return "past"; // ended in the past
  return "active"; // somewhere inside the window
}

/** Status the UI should show: the manual override if set, else date-derived. */
export function effectiveStatus(trip: Trip, now: Date = new Date()): TripStatus {
  return trip.status_override
    ? trip.status
    : deriveStatus(trip.start_date, trip.end_date, now);
}

type StatusMeta = { label: string; tone: "dreaming" | "upcoming" | "active" | "past" };

export const STATUS_META: Record<TripStatus, StatusMeta> = {
  dreaming: { label: "Dreaming", tone: "dreaming" },
  upcoming: { label: "Upcoming", tone: "upcoming" },
  active: { label: "Happening now", tone: "active" },
  past: { label: "Remembered", tone: "past" },
};

/**
 * Editorial date range. Collapses shared month/year so it reads like a magazine
 * caption rather than a form field.
 *   Jun 21–28, 2026 · Jun 28 – Jul 4, 2026 · Dec 28, 2026 – Jan 3, 2027
 */
export function formatDateRange(
  start: string | null,
  end: string | null,
): string {
  const s = safeParse(start);
  const e = safeParse(end);
  if (!s && !e) return "Dates to dream up";
  if (s && !e) return `From ${format(s, "MMM d, yyyy")}`;
  if (!s && e) return `Until ${format(e, "MMM d, yyyy")}`;
  if (s && e) {
    if (isSameMonth(s, e)) return `${format(s, "MMM d")}–${format(e, "d, yyyy")}`;
    if (isSameYear(s, e))
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
  }
  return "Dates to dream up";
}

/** Whole days from `from` until the trip starts. Negative once it's begun. */
export function daysUntilStart(
  start: string | null,
  from: Date = new Date(),
): number | null {
  const s = safeParse(start);
  if (!s) return null;
  return differenceInCalendarDays(s, from);
}

/** Nights between start and end (0 for single-day or open trips). */
export function tripNights(start: string | null, end: string | null): number {
  const s = safeParse(start);
  const e = safeParse(end);
  if (!s || !e) return 0;
  return Math.max(0, differenceInCalendarDays(e, s));
}

/** Short human countdown for a card pill: "in 3 weeks", "Tomorrow", "Today". */
export function shortCountdown(days: number): string {
  if (days < 0) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

/**
 * Display order for the trips list: what's happening now, then what's coming
 * (soonest first), then daydreams, then memories (most recent first).
 */
export function sortTripsForList(trips: Trip[], now: Date = new Date()): Trip[] {
  const rank: Record<TripStatus, number> = {
    active: 0,
    upcoming: 1,
    dreaming: 2,
    past: 3,
  };
  return [...trips].sort((a, b) => {
    const sa = effectiveStatus(a, now);
    const sb = effectiveStatus(b, now);
    if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
    // within a bucket, order by the date that matters for that bucket
    if (sa === "upcoming" || sa === "active") {
      return (a.start_date ?? "").localeCompare(b.start_date ?? "");
    }
    if (sa === "past") {
      return (b.start_date ?? "").localeCompare(a.start_date ?? "");
    }
    return b.created_at.localeCompare(a.created_at);
  });
}
