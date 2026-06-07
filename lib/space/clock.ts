import { FALLBACK_TZ } from "./types";

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

/** The hours we treat as "awake" for the call-overlap band (minutes from midnight). */
export const WAKE_START_MIN = 8 * 60; // 8:00 AM
export const WAKE_END_MIN = 23 * 60; // 11:00 PM

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
 * "good time to call" band. Your waking window never wraps midnight, so the
 * overlap resolves to 0–2 tidy windows inside the day.
 */
export function awakeOverlap(
  date: Date,
  tz: string,
  baseTz: string,
): AwakeOverlap {
  const diffMinutes = offsetMinutesBetween(date, tz, baseTz);
  const step = 15;
  const isAwake = (localMin: number) => {
    const m = ((localMin % 1440) + 1440) % 1440;
    return m >= WAKE_START_MIN && m < WAKE_END_MIN;
  };
  const bothAwakeAt = (baseMin: number) =>
    isAwake(baseMin) && isAwake(baseMin + diffMinutes);

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
