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
