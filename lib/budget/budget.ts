import {
  DEFAULT_CATEGORIES,
  categoryById,
  type Category,
} from "@/lib/itinerary/categories";
import type { ItineraryEvent } from "@/lib/itinerary/types";
import type { EventStatus } from "@/lib/supabase/types";

/**
 * Budget view model. Spend comes from the `cost` on each itinerary event; the
 * `budget` is the one number the couple sets by hand. Pure — no formatting, no
 * React — so it's trivially testable and the tab just renders the shape.
 *
 * Note: costs are summed at face value in the trip's currency. The event form
 * defaults each cost to the trip currency, so mixed-currency math (FX) is out
 * of scope here on purpose — this is a couple's rough ledger, not accounting.
 */

/** Booked + done = money you're committed to; idea + planned = still soft. */
const COMMITTED_STATUSES: EventStatus[] = ["booked", "done"];

export function isCommitted(status: EventStatus): boolean {
  return COMMITTED_STATUSES.includes(status);
}

/** One category's slice of the spend. */
export interface CategoryBudgetStat {
  category: Category;
  total: number;
  committed: number;
  planned: number;
  count: number;
  /** total relative to the biggest category, 0–1 — drives the meter fill. */
  share: number;
}

export type BudgetTone = "none" | "healthy" | "close" | "over";

export interface BudgetSummary {
  /** The hand-set target, or null when none. */
  budget: number | null;
  currency: string;
  /** Sum of every event cost. */
  spent: number;
  /** Spend on booked/done events — money committed. */
  committed: number;
  /** Spend on idea/planned events — money still soft. */
  planned: number;
  /** budget − spent, or null when no budget. Negative once over. */
  remaining: number | null;
  /** spent ÷ budget, 0 when no budget. Not clamped (can exceed 1). */
  ratio: number;
  over: boolean;
  tone: BudgetTone;
  /** Categories with spend, biggest first. */
  byCategory: CategoryBudgetStat[];
  /** Spend on events with no category set. */
  uncategorizedTotal: number;
  /** Events that carry a cost. */
  itemCount: number;
}

type Tally = { total: number; committed: number; planned: number; count: number };

/** Summarize a set of events + target into the Budget view model. Pure. */
export function buildBudget(
  events: ItineraryEvent[],
  budget: number | null,
  currency: string,
): BudgetSummary {
  const tally = new Map<string, Tally>();
  let spent = 0;
  let committed = 0;
  let planned = 0;
  let uncategorizedTotal = 0;
  let itemCount = 0;

  for (const e of events) {
    const cost = e.cost ?? 0;
    if (cost <= 0) continue;
    itemCount += 1;
    spent += cost;
    const comm = isCommitted(e.status);
    if (comm) committed += cost;
    else planned += cost;

    const cat = categoryById(e.category_id);
    if (!cat) {
      uncategorizedTotal += cost;
      continue;
    }
    const cur = tally.get(cat.id) ?? { total: 0, committed: 0, planned: 0, count: 0 };
    cur.total += cost;
    cur.count += 1;
    if (comm) cur.committed += cost;
    else cur.planned += cost;
    tally.set(cat.id, cur);
  }

  const maxTotal = Math.max(0, ...Array.from(tally.values(), (v) => v.total));

  const byCategory: CategoryBudgetStat[] = DEFAULT_CATEGORIES.filter((c) =>
    tally.has(c.id),
  )
    .map((c) => {
      const t = tally.get(c.id)!;
      return {
        category: c,
        total: t.total,
        committed: t.committed,
        planned: t.planned,
        count: t.count,
        share: maxTotal > 0 ? t.total / maxTotal : 0,
      };
    })
    .sort(
      (a, b) => b.total - a.total || a.category.name.localeCompare(b.category.name),
    );

  const remaining = budget != null ? budget - spent : null;
  const ratio = budget && budget > 0 ? spent / budget : 0;
  const over = budget != null && spent > budget;
  const tone: BudgetTone =
    budget == null ? "none" : over ? "over" : ratio >= 0.9 ? "close" : "healthy";

  return {
    budget,
    currency,
    spent,
    committed,
    planned,
    remaining,
    ratio,
    over,
    tone,
    byCategory,
    uncategorizedTotal,
    itemCount,
  };
}
