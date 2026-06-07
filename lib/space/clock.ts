import { DEFAULT_WAKE_END, DEFAULT_WAKE_START, FALLBACK_TZ } from "./types";

/**
 * Wall-clock pieces for an instant in a given IANA zone. Pure + locale-stable
 * (forced en-US) so callers can render the same string anywhere. Never called
 * at module load — only from ticking client components — so it can't cause a
 * hydration mismatch.
 */
export interface ZonedTime {
  /** "9:14" */
  time: string;
  /** "PM" (may be empty in 24h locales) */
  period: string;
  /** "Mon" */
  weekday: string;
  /** "9:14 PM" */
  label: string;
}

export function zonedTime(date: Date, tz: string): ZonedTime {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || FALLBACK_TZ,
      hour: "numeric",
      minute: "2-digit",
      weekday: "short",
      hour12: true,
    }).formatToParts(date);
    const get = (t: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === t)?.value ?? "";
    const time = `${get("hour")}:${get("minute")}`;
    const period = get("dayPeriod");
    const weekday = get("weekday");
    return { time, period, weekday, label: `${time}${period ? ` ${period}` : ""}` };
  } catch {
    return { time: "--:--", period: "", weekday: "", label: "--:--" };
  }
}

/** UTC offset (in minutes) for a zone at a given instant, via shortOffset. */
function tzOffsetMinutes(date: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || FALLBACK_TZ,
      timeZoneName: "shortOffset",
    }).formatToParts(date);
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
    const m = name.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    return h * 60 + (h < 0 ? -min : min);
  } catch {
    return 0;
  }
}

/**
 * Friendly read of how `tz` relates to `baseTz` right now:
 * "same time as you", "5 hours ahead", "2 hrs 30 min behind".
 */
export function offsetLabel(date: Date, tz: string, baseTz: string): string {
  const diff = tzOffsetMinutes(date, tz) - tzOffsetMinutes(date, baseTz);
  if (diff === 0) return "same time as you";
  const ahead = diff > 0;
  const mins = Math.abs(diff);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hr${h > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} min`);
  return `${parts.join(" ")} ${ahead ? "ahead" : "behind"}`;
}

/** A person's waking window, in minutes from local midnight. */
export interface WakeWindow {
  start: number;
  end: number;
}

/** Fallback waking window when a member hasn't set their own. */
export const DEFAULT_WAKE: WakeWindow = {
  start: DEFAULT_WAKE_START,
  end: DEFAULT_WAKE_END,
};

/**
 * Is `localMin` (minutes from local midnight) inside the waking window? Handles
 * windows that wrap past midnight (e.g. a night owl awake 9:00 AM → 2:00 AM).
 */
export function withinWake(localMin: number, w: WakeWindow): boolean {
  const m = ((Math.round(localMin) % 1440) + 1440) % 1440;
  if (w.start === w.end) return false;
  return w.start < w.end
    ? m >= w.start && m < w.end
    : m >= w.start || m < w.end;
}

/** "08:00" ⇄ minutes, for binding a native <input type="time"> to a window. */
export function minutesToHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** How far `tz` is from `baseTz` right now, in minutes (positive = ahead). */
export function offsetMinutesBetween(
  date: Date,
  tz: string,
  baseTz: string,
): number {
  return tzOffsetMinutes(date, tz) - tzOffsetMinutes(date, baseTz);
}

/** Minutes since local midnight in `tz` for the given instant (0–1439). */
export function zonedMinutes(date: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || FALLBACK_TZ,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
    const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    return h * 60 + m;
  } catch {
    return 0;
  }
}

export interface OverlapWindow {
  /** Minutes from your local midnight (0–1440). */
  start: number;
  end: number;
}

export interface AwakeOverlap {
  /** Contiguous windows, in `baseTz` (your) local minutes, when both are awake. */
  windows: OverlapWindow[];
  /** Total overlapping minutes across the day. */
  totalMinutes: number;
  /** How far `tz` is from `baseTz`, in minutes. */
  diffMinutes: number;
}

/**
 * When are both people awake, expressed in `baseTz` (your) local time? Powers the
 * "good time to call" band, using each person's own waking window. The overlap
 * resolves to 0–2 windows across the day (a window that wraps midnight shows as
 * one at each edge).
 */
export function awakeOverlap(
  date: Date,
  tz: string,
  baseTz: string,
  baseWake: WakeWindow = DEFAULT_WAKE,
  otherWake: WakeWindow = DEFAULT_WAKE,
): AwakeOverlap {
  const diffMinutes = offsetMinutesBetween(date, tz, baseTz);
  const step = 15;
  const bothAwakeAt = (baseMin: number) =>
    withinWake(baseMin, baseWake) &&
    withinWake(baseMin + diffMinutes, otherWake);

  const windows: OverlapWindow[] = [];
  let runStart: number | null = null;
  for (let m = 0; m <= 1440; m += step) {
    const on = m < 1440 && bothAwakeAt(m);
    if (on && runStart === null) runStart = m;
    if (!on && runStart !== null) {
      windows.push({ start: runStart, end: m });
      runStart = null;
    }
  }
  const totalMinutes = windows.reduce((s, w) => s + (w.end - w.start), 0);
  return { windows, totalMinutes, diffMinutes };
}
