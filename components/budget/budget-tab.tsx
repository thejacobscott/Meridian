"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Pencil, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  buildBudget,
  type BudgetTone,
  type CategoryBudgetStat,
} from "@/lib/budget/budget";
import { useTripEvents } from "@/lib/itinerary/store";
import { formatMoney } from "@/lib/itinerary/types";
import { fadeUp, spring, staggerContainer } from "@/lib/motion";
import { useTrips } from "@/lib/trips/store";
import type { Trip } from "@/lib/trips/types";

/**
 * The Budget sub-tab — the couple's rough ledger. A calm top-line (spent against
 * the target they set by hand) is always visible; the per-category breakdown is
 * collapsible so the tab stays editorial rather than dashboard. Spend is read
 * from the cost on each itinerary event, split into committed (booked/done) vs.
 * still-soft (idea/planned).
 */
const TONE_META: Record<
  Exclude<BudgetTone, "none">,
  { label: string; color: string }
> = {
  healthy: { label: "On track", color: "var(--color-sage)" },
  close: { label: "Getting close", color: "var(--color-gold)" },
  over: { label: "Over target", color: "var(--color-clay)" },
};

export function BudgetTab({ trip }: { trip: Trip }) {
  const reduce = useReducedMotion();
  const { events } = useTripEvents(trip.id);
  const { updateTrip } = useTrips();

  const [open, setOpen] = React.useState(false);

  const summary = React.useMemo(
    () => buildBudget(events, trip.budget, trip.currency),
    [events, trip.budget, trip.currency],
  );

  const hasSpend = summary.itemCount > 0;
  const hasBudget = summary.budget != null;

  const saveBudget = React.useCallback(
    (next: number | null) => {
      // title is carried so the partial update satisfies TripDraft; the store
      // treats every other field as a patch over the existing trip.
      void updateTrip(trip.id, { title: trip.title, budget: next });
    },
    [updateTrip, trip.id, trip.title],
  );

  // Nothing logged and no target yet — invite the first move.
  if (!hasSpend && !hasBudget) {
    return (
      <div className="space-y-6">
        <div className="rounded-card border border-dashed border-line bg-surface/40 px-7 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
            <Wallet size={22} strokeWidth={1.5} />
          </span>
          <h3 className="mt-4 text-lg">No costs counted yet</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft text-balance">
            Add a price to anything on the itinerary and it totals up here. Set a
            target and you&apos;ll see how much of it is left.
          </p>
          <div className="mt-5 flex justify-center">
            <TargetEditor
              budget={summary.budget}
              currency={trip.currency}
              onSave={saveBudget}
            />
          </div>
        </div>
      </div>
    );
  }

  const tone = summary.tone === "none" ? null : TONE_META[summary.tone];
  const barColor = tone?.color ?? "var(--color-sage)";
  const pct = Math.round(Math.min(1, summary.ratio) * 100);

  return (
    <div className="space-y-6">
      {/* Top line — always visible */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Spent so far</p>
            <p className="mt-1 font-display text-[2rem] leading-none tracking-[-0.01em] text-ink">
              {formatMoney(summary.spent, trip.currency)}
            </p>
          </div>
          <TargetEditor
            budget={summary.budget}
            currency={trip.currency}
            onSave={saveBudget}
          />
        </div>

        {hasBudget && (
          <>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-ink/[0.05]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={summary.budget ?? 0}
              aria-valuenow={Math.round(summary.spent)}
              aria-label="Budget used"
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={spring}
              />
            </div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <SpendCaption summary={summary} currency={trip.currency} />
              {summary.over ? (
                <span className="shrink-0 font-medium text-clay tabular-nums">
                  {formatMoney(Math.abs(summary.remaining ?? 0), trip.currency)} over
                </span>
              ) : (
                <span className="shrink-0 text-ink-soft tabular-nums">
                  {formatMoney(summary.remaining ?? 0, trip.currency)} left
                </span>
              )}
            </div>
            {tone && (
              <div className="pt-0.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    color: tone.color,
                    backgroundColor: `color-mix(in oklab, ${tone.color} 12%, transparent)`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tone.color }}
                    aria-hidden="true"
                  />
                  {tone.label}
                </span>
              </div>
            )}
          </>
        )}

        {!hasBudget && hasSpend && (
          <SpendCaption summary={summary} currency={trip.currency} />
        )}
      </div>

      {/* Collapsible breakdown */}
      {summary.byCategory.length > 0 && (
        <div className="border-t border-line/70 pt-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="eyebrow">Where it&apos;s going</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-soft">
              {summary.byCategory.length}{" "}
              {summary.byCategory.length === 1 ? "category" : "categories"}
              <ChevronDown
                size={15}
                strokeWidth={2}
                className={cn(
                  "transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </span>
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="breakdown"
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={
                  reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }
                }
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <motion.ul
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-3.5 pt-4"
                >
                  {summary.byCategory.map((stat, i) => (
                    <CategoryBar
                      key={stat.category.id}
                      stat={stat}
                      index={i}
                      currency={trip.currency}
                      reduce={!!reduce}
                    />
                  ))}
                  {summary.uncategorizedTotal > 0 && (
                    <li className="flex items-center justify-between gap-3 pt-1 text-sm text-ink-soft">
                      <span>Uncategorized</span>
                      <span className="tabular-nums">
                        {formatMoney(summary.uncategorizedTotal, trip.currency)}
                      </span>
                    </li>
                  )}
                </motion.ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** "€455 committed · €150 still planned" — the spend's confidence split. */
function SpendCaption({
  summary,
  currency,
}: {
  summary: ReturnType<typeof buildBudget>;
  currency: string;
}) {
  const parts: string[] = [];
  if (summary.committed > 0)
    parts.push(`${formatMoney(summary.committed, currency)} committed`);
  if (summary.planned > 0)
    parts.push(`${formatMoney(summary.planned, currency)} still planned`);
  if (parts.length === 0) return <span className="text-ink-soft">No spend yet</span>;
  return <span className="min-w-0 truncate text-ink-soft">{parts.join(" · ")}</span>;
}

function CategoryBar({
  stat,
  index,
  currency,
  reduce,
}: {
  stat: CategoryBudgetStat;
  index: number;
  currency: string;
  reduce: boolean;
}) {
  const { category, total, share } = stat;
  const Icon = category.icon;
  const pct = Math.max(6, Math.round(share * 100));

  return (
    <motion.li variants={fadeUp} className="list-none">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in oklab, ${category.color} 16%, transparent)`,
              color: category.color,
            }}
          >
            <Icon size={13} strokeWidth={2} />
          </span>
          <span className="truncate text-sm font-medium text-ink">
            {category.name}
          </span>
        </span>
        <span className="shrink-0 text-sm tabular-nums text-ink-soft">
          {formatMoney(total, currency)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink/[0.05]">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: `color-mix(in oklab, ${category.color} 82%, var(--color-paper))`,
          }}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ...spring, delay: 0.05 + index * 0.04 }}
        />
      </div>
    </motion.li>
  );
}

/** Inline "of €2,500" with a pencil, or a "Set a target" button — both edit in place. */
function TargetEditor({
  budget,
  currency,
  onSave,
}: {
  budget: number | null;
  currency: string;
  onSave: (next: number | null) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState("");

  // Seed the field from the stored budget each time the editor opens — fresher
  // than a sync effect, and typing is never clobbered by an external change.
  function startEdit() {
    setVal(budget != null ? String(budget) : "");
    setEditing(true);
  }
  function commit() {
    const n = Number.parseFloat(val.replace(/[^0-9.]/g, ""));
    onSave(!val.trim() || Number.isNaN(n) || n <= 0 ? null : n);
    setEditing(false);
  }
  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-xs text-ink-soft/70">{currency}</span>
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              cancel();
            }
          }}
          inputMode="decimal"
          placeholder="2500"
          aria-label="Budget target"
          autoFocus
          className="h-9 w-24 px-2.5 text-right text-sm tabular-nums"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Save target"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-deep"
        >
          <Check size={15} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (budget == null) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={startEdit}
        className="shrink-0"
      >
        Set a target
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group flex shrink-0 items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      aria-label="Edit budget target"
    >
      <span className="tabular-nums">of {formatMoney(budget, currency)}</span>
      <Pencil
        size={13}
        strokeWidth={2}
        className="text-ink-soft/50 transition-colors group-hover:text-ink-soft"
      />
    </button>
  );
}
