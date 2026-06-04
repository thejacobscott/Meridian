"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/itinerary/categories";
import {
  balanceReadout,
  buildBalance,
  formatDuration,
  type BalanceScope,
  type BalanceSummary,
  type CategoryStat,
} from "@/lib/itinerary/balance";
import { useEvents, useTripEvents } from "@/lib/itinerary/store";
import { tripDays } from "@/lib/itinerary/types";
import { fadeUp, spring, staggerContainer } from "@/lib/motion";
import type { Trip } from "@/lib/trips/types";
import { EventForm } from "./event-form";

/**
 * The Balance sub-tab — the analytical hook. Reads the shape of a trip (or the
 * couple's all-time travel personality) as ranked "level meters," one per
 * category in its own color, and nudges a real edit when something's missing.
 */
export function BalanceTab({ trip }: { trip: Trip }) {
  const reduce = useReducedMotion();
  const { events: tripEvents } = useTripEvents(trip.id);
  const { getAllEvents, createEvent } = useEvents();

  const [scope, setScope] = React.useState<BalanceScope>("trip");
  const [nudge, setNudge] = React.useState<Category | null>(null);

  const summary = React.useMemo(
    () => buildBalance(scope === "trip" ? tripEvents : getAllEvents()),
    [scope, tripEvents, getAllEvents],
  );

  const days = React.useMemo(
    () => tripDays(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date],
  );

  const readout = balanceReadout(summary, scope);
  const canNudge = scope === "trip";
  const suggestion = summary.suggestion;

  return (
    <div className="space-y-5">
      <ScopeToggle scope={scope} onChange={setScope} />

      {summary.eventCount === 0 ? (
        <EmptyState scope={scope} />
      ) : (
        <>
          {/* Hero read-out + one-tap nudge */}
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              <motion.p
                key={readout}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="font-display text-[1.45rem] leading-snug tracking-[-0.01em] text-balance text-ink"
              >
                {readout}
              </motion.p>
            </AnimatePresence>

            {canNudge && suggestion && (
              <Button type="button" size="sm" onClick={() => setNudge(suggestion)}>
                <Plus size={15} strokeWidth={2} />
                Add {suggestion.name.toLowerCase()}
              </Button>
            )}
          </div>

          {summary.present.length > 0 && (
            <>
              <p className="text-sm text-ink-soft">{summaryLine(summary, scope)}</p>

              <motion.ul
                key={scope}
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-3.5"
              >
                {summary.present.map((stat, i) => (
                  <BalanceMeter
                    key={stat.category.id}
                    stat={stat}
                    index={i}
                    reduce={!!reduce}
                  />
                ))}
              </motion.ul>
            </>
          )}

          {/* Nothing yet — tappable gaps that open a preset add sheet */}
          {canNudge && summary.missing.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-2",
                summary.present.length > 0 && "border-t border-line/70 pt-4",
              )}
            >
              <span className="text-xs text-ink-soft/70">Nothing yet ·</span>
              {summary.missing.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNudge(c)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
                  >
                    <Icon size={12} strokeWidth={2} style={{ color: c.color }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Nudge: add an event already set to the missing category */}
      <Sheet
        open={nudge !== null}
        onClose={() => setNudge(null)}
        title={nudge ? `Add ${nudge.name.toLowerCase()}` : "Add to the plan"}
      >
        {nudge && (
          <EventForm
            days={days}
            defaultDate={days[0] ?? null}
            defaultCategoryId={nudge.id}
            tripCurrency={trip.currency}
            accent={trip.accent_color}
            onSubmit={(draft) => createEvent(trip.id, draft)}
            onDone={() => setNudge(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function summaryLine(s: BalanceSummary, scope: BalanceScope): string {
  const plans = `${s.totalCount} ${s.totalCount === 1 ? "plan" : "plans"}`;
  const kinds = `${s.present.length} ${s.present.length === 1 ? "category" : "categories"}`;
  const dur = formatDuration(s.totalMinutes);
  const tail = dur ? ` · ${dur} timed` : "";
  if (scope === "all") {
    const trips = `${s.tripCount} ${s.tripCount === 1 ? "trip" : "trips"}`;
    return `${plans} in ${kinds} across ${trips}${tail}`;
  }
  return `${plans} in ${kinds}${tail}`;
}

function BalanceMeter({
  stat,
  index,
  reduce,
}: {
  stat: CategoryStat;
  index: number;
  reduce: boolean;
}) {
  const { category, count, minutes, share } = stat;
  const Icon = category.icon;
  const pct = Math.max(6, Math.round(share * 100));
  const dur = formatDuration(minutes);

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
          {count}
          {dur && <span className="text-ink-soft/70"> · {dur}</span>}
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

function ScopeToggle({
  scope,
  onChange,
}: {
  scope: BalanceScope;
  onChange: (s: BalanceScope) => void;
}) {
  const opts: { id: BalanceScope; label: string }[] = [
    { id: "trip", label: "This trip" },
    { id: "all", label: "All time" },
  ];
  return (
    <div className="inline-flex rounded-full border border-line bg-surface-2/60 p-1">
      {opts.map((o) => {
        const on = scope === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              on ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {on && (
              <motion.span
                layoutId="balance-scope"
                className="absolute inset-0 rounded-full bg-surface shadow-soft ring-1 ring-line"
                transition={spring}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ scope }: { scope: BalanceScope }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface/40 px-7 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
        <Scale size={22} strokeWidth={1.5} />
      </span>
      <h3 className="mt-4 text-lg">Nothing to weigh yet</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft text-balance">
        {scope === "trip"
          ? "Add a few things to the itinerary and the balance of this trip takes shape here."
          : "Once you've planned across a few trips, your travel personality shows up here."}
      </p>
    </div>
  );
}
