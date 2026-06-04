import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { EventStatus } from "@/lib/supabase/types";

export type { EventStatus };

/**
 * The app's view model for an itinerary event. Mirrors the `events` row
 * (lib/supabase/types) but collapses the separate `days` table into a single
 * `date` field — null means an unscheduled idea, parked in the "Ideas" bucket.
 * The future Supabase provider maps `date` ↔ a `days` row behind the same
 * interface, so the UI never has to care.
 */
export interface ItineraryEvent {
  id: string;
  trip_id: string;
  date: string | null; // YYYY-MM-DD, or null = unscheduled
  title: string;
  category_id: string | null;
  start_time: string | null; // "HH:MM" 24h
  end_time: string | null; // "HH:MM" 24h
  location_name: string | null;
  notes: string | null;
  cost: number | null;
  currency: string | null;
  booking_ref: string | null;
  status: EventStatus;
  sort_order: number;
  created_at: string;
}

/** What the event form hands to the store. Fields left undefined are unchanged. */
export interface EventDraft {
  title: string;
  date?: string | null;
  category_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location_name?: string | null;
  notes?: string | null;
  cost?: number | null;
  currency?: string | null;
  booking_ref?: string | null;
  status?: EventStatus;
}

export const EVENT_STATUSES: EventStatus[] = ["idea", "planned", "booked", "done"];

type EventStatusMeta = { label: string; tone: EventStatus };

export const EVENT_STATUS_META: Record<EventStatus, EventStatusMeta> = {
  idea: { label: "Idea", tone: "idea" },
  planned: { label: "Planned", tone: "planned" },
  booked: { label: "Booked", tone: "booked" },
  done: { label: "Done", tone: "done" },
};

// ---------------------------------------------------------------------------
// Dates & the day strip
// ---------------------------------------------------------------------------
function safeParse(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = parseISO(d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function isTodayISO(dateISO: string | null, now: Date = new Date()): boolean {
  return !!dateISO && dateISO === toISODate(now);
}

/**
 * Every calendar day of a trip, inclusive of both ends. Empty when dates are
 * missing or invalid. Capped at 120 days so a stray date can't blow up the strip.
 */
export function tripDays(start: string | null, end: string | null): string[] {
  const s = safeParse(start);
  const e = safeParse(end) ?? s;
  if (!s || !e) return [];
  const span = differenceInCalendarDays(e, s);
  if (span < 0) return [];
  const count = Math.min(span, 120);
  const out: string[] = [];
  for (let i = 0; i <= count; i++) out.push(toISODate(addDays(s, i)));
  return out;
}

/** Day chip parts: { weekday: "Sat", day: "21", month: "Jun" }. */
export function dayParts(dateISO: string): { weekday: string; day: string; month: string } {
  const d = safeParse(dateISO);
  if (!d) return { weekday: "", day: "", month: "" };
  return { weekday: format(d, "EEE"), day: format(d, "d"), month: format(d, "MMM") };
}

/** "Day 3" index within the trip (1-based), or null if it can't be placed. */
export function dayNumber(dateISO: string, start: string | null): number | null {
  const s = safeParse(start);
  const d = safeParse(dateISO);
  if (!s || !d) return null;
  return differenceInCalendarDays(d, s) + 1;
}

/** Long, editorial day heading: "Saturday, Jun 21". */
export function dayHeading(dateISO: string): string {
  const d = safeParse(dateISO);
  return d ? format(d, "EEEE, MMM d") : "";
}

// ---------------------------------------------------------------------------
// Time & money formatting
// ---------------------------------------------------------------------------
/** "09:30" → "9:30 AM"; "14:00" → "2 PM". Empty string for null/garbage. */
export function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr ?? "0", 10);
  if (Number.isNaN(h)) return "";
  const ampm = h < 12 ? "AM" : "PM";
  h %= 12;
  if (h === 0) h = 12;
  const mins = Number.isNaN(m) ? 0 : m;
  return mins === 0 ? `${h} ${ampm}` : `${h}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

/** "9:30 AM – 11 AM", or just the start, or "" when untimed. */
export function formatTimeRange(start: string | null, end: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  return s || "";
}

/** Localized currency, dropping cents for whole amounts. */
export function formatMoney(amount: number, currency: string | null): string {
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${code}`.trim();
  }
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------
/** Display order within a single day: by manual sort_order, then by age. */
export function byDisplayOrder(a: ItineraryEvent, b: ItineraryEvent): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at.localeCompare(b.created_at);
}

/**
 * Where a new event should slot into a day so the timeline reads chronologically
 * by default: a timed event goes before the first later (or untimed) event; an
 * untimed event lands at the end. Manual drags can override afterward.
 */
export function timeInsertionIndex(
  dayEvents: ItineraryEvent[],
  startTime: string | null,
): number {
  if (!startTime) return dayEvents.length;
  for (let i = 0; i < dayEvents.length; i++) {
    const t = dayEvents[i].start_time;
    if (!t || t > startTime) return i;
  }
  return dayEvents.length;
}

// ---------------------------------------------------------------------------
// "Today / Now" affordance
// ---------------------------------------------------------------------------
/**
 * For an active trip, pick the event to surface for today: the one happening
 * right now (has an end time that covers the moment), else the next one to come.
 * Returns null when today has nothing timed left.
 */
export function pickNowEvent(
  todayEvents: ItineraryEvent[],
  now: Date = new Date(),
): { mode: "now" | "next"; event: ItineraryEvent } | null {
  const cur = format(now, "HH:mm");
  const timed = todayEvents
    .filter((e) => e.start_time)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!));
  const current = timed.find(
    (e) => e.start_time! <= cur && e.end_time != null && cur < e.end_time,
  );
  if (current) return { mode: "now", event: current };
  const next = timed.find((e) => e.start_time! > cur);
  if (next) return { mode: "next", event: next };
  return null;
}
