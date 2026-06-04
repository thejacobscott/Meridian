import {
  DEFAULT_CATEGORIES,
  categoryById,
  type Category,
} from "./categories";
import type { ItineraryEvent } from "./types";

export type BalanceScope = "trip" | "all";

export type BalanceWeight = "heavy" | "medium" | "light";

/** One category's footprint across the events being summarized. */
export interface CategoryStat {
  category: Category;
  count: number;
  minutes: number;
  /** Count relative to the busiest category, 0–1 — drives the meter fill. */
  share: number;
  weight: BalanceWeight;
}

export interface BalanceSummary {
  /** Categories with at least one event, heaviest first. */
  present: CategoryStat[];
  /** Default categories with nothing yet, in gentle-nudge priority order. */
  missing: Category[];
  /** Total categorized events. */
  totalCount: number;
  /** Total planned minutes across categorized events. */
  totalMinutes: number;
  /** Events with no category set. */
  uncategorized: number;
  /** Every event considered, categorized or not. */
  eventCount: number;
  /** Distinct trips represented (for the all-time read-out). */
  tripCount: number;
  topCategory: Category | null;
  /** The one missing category we surface as a one-tap nudge. */
  suggestion: Category | null;
}

/**
 * Which empty categories are worth nudging first. Curated, not alphabetical:
 * the gaps a couple is most likely to *want* filled lead. Drives both the hero
 * suggestion and the order of the "nothing yet" chips.
 */
const NUDGE_PRIORITY = [
  "cat-culture",
  "cat-food",
  "cat-romance",
  "cat-outdoors",
  "cat-relax",
  "cat-sightseeing",
  "cat-adventure",
  "cat-nightlife",
  "cat-shopping",
  "cat-travel",
];

function toMinutes(t: string): number | null {
  const [h, m] = t.split(":");
  const hh = Number.parseInt(h, 10);
  if (Number.isNaN(hh)) return null;
  const mm = Number.parseInt(m ?? "0", 10);
  return hh * 60 + (Number.isNaN(mm) ? 0 : mm);
}

/** Planned length of an event in minutes; 0 when untimed or end ≤ start. */
export function eventDurationMinutes(e: ItineraryEvent): number {
  if (!e.start_time || !e.end_time) return 0;
  const s = toMinutes(e.start_time);
  const en = toMinutes(e.end_time);
  if (s == null || en == null) return 0;
  return en > s ? en - s : 0;
}

/** "6h", "1h 30m", "45m"; empty string for 0. */
export function formatDuration(min: number): string {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Summarize a set of events into the Balance view model. Pure. */
export function buildBalance(events: ItineraryEvent[]): BalanceSummary {
  const tally = new Map<string, { count: number; minutes: number }>();
  const trips = new Set<string>();
  let uncategorized = 0;

  for (const e of events) {
    trips.add(e.trip_id);
    const cat = categoryById(e.category_id);
    if (!cat) {
      uncategorized += 1;
      continue;
    }
    const cur = tally.get(cat.id) ?? { count: 0, minutes: 0 };
    cur.count += 1;
    cur.minutes += eventDurationMinutes(e);
    tally.set(cat.id, cur);
  }

  const maxCount = Math.max(0, ...Array.from(tally.values(), (v) => v.count));

  const present: CategoryStat[] = DEFAULT_CATEGORIES.filter((c) =>
    tally.has(c.id),
  )
    .map((c) => {
      const { count, minutes } = tally.get(c.id)!;
      const share = maxCount > 0 ? count / maxCount : 0;
      const weight: BalanceWeight =
        share >= 0.66 ? "heavy" : share <= 0.34 ? "light" : "medium";
      return { category: c, count, minutes, share, weight };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.minutes - a.minutes ||
        a.category.name.localeCompare(b.category.name),
    );

  const missing: Category[] = NUDGE_PRIORITY.map((id) =>
    DEFAULT_CATEGORIES.find((c) => c.id === id),
  ).filter((c): c is Category => !!c && !tally.has(c.id));

  const totalCount = present.reduce((n, s) => n + s.count, 0);
  const totalMinutes = present.reduce((n, s) => n + s.minutes, 0);

  return {
    present,
    missing,
    totalCount,
    totalMinutes,
    uncategorized,
    eventCount: events.length,
    tripCount: trips.size,
    topCategory: present[0]?.category ?? null,
    suggestion: missing[0] ?? null,
  };
}

function lower(name: string): string {
  return name.toLowerCase();
}

/**
 * The plain-language hero line: reads the shape of the plan back to the couple
 * and, when something's missing, teases the nudge. Scope changes the framing —
 * one trip's shape vs. the couple's all-time travel personality.
 */
export function balanceReadout(s: BalanceSummary, scope: BalanceScope): string {
  if (s.totalCount === 0) {
    if (s.eventCount > 0) {
      return "A few plans so far, but nothing's sorted into a category yet.";
    }
    return scope === "all"
      ? "Your travel story starts with the first plan you save."
      : "This trip's a blank page. Add a few plans and its shape appears here.";
  }

  if (scope === "all") {
    const top = lower(s.topCategory!.name);
    if (s.suggestion) {
      return `Across your trips you're ${top} people — never much for ${lower(s.suggestion.name)}.`;
    }
    return `Across every trip, ${top} is your signature.`;
  }

  const top = lower(s.topCategory!.name);
  if (s.present.length === 1) {
    return `So far it's all ${top}.`;
  }
  if (s.suggestion) {
    return `Heavy on ${top}, and no ${lower(s.suggestion.name)} yet.`;
  }
  return `A lovely spread — ${top} just edges ahead.`;
}
