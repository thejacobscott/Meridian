"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { dayParts, isTodayISO } from "@/lib/itinerary/types";
import { spring } from "@/lib/motion";

/**
 * The horizontal day scroller. One chip per trip day (plus an always-present
 * "Ideas" bucket for unscheduled events), each showing the day's color
 * signature. Today is labeled; the selected day carries the shared accent pill.
 */
export function DayStrip({
  days,
  selected,
  onSelect,
  dotsFor,
}: {
  days: string[];
  selected: string | null; // null = Ideas / unscheduled
  onSelect: (date: string | null) => void;
  dotsFor: (key: string | null) => string[];
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  // Keep the selected chip in view as the day changes.
  React.useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(
      '[data-selected="true"]',
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div
      ref={scrollerRef}
      className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6"
    >
      {days.map((d) => {
        const parts = dayParts(d);
        const today = isTodayISO(d);
        const isSel = selected === d;
        return (
          <DayChip
            key={d}
            selected={isSel}
            onClick={() => onSelect(d)}
            label={today ? "Today" : parts.weekday}
            highlightLabel={today}
            dots={dotsFor(d)}
          >
            <span className="text-lg font-medium leading-none tabular-nums">
              {parts.day}
            </span>
          </DayChip>
        );
      })}

      <DayChip
        selected={selected === null}
        onClick={() => onSelect(null)}
        label="Anytime"
        wide
        dots={dotsFor(null)}
      >
        <span className="inline-flex items-center gap-1 text-sm font-medium leading-none">
          <Sparkles size={14} strokeWidth={1.75} />
          Ideas
        </span>
      </DayChip>
    </div>
  );
}

function DayChip({
  selected,
  onClick,
  label,
  highlightLabel,
  dots,
  wide,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  highlightLabel?: boolean;
  dots: string[];
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={selected}
      aria-pressed={selected}
      className={cn(
        "relative shrink-0 rounded-xl px-2.5 py-2 text-center transition-colors",
        wide ? "min-w-[4.5rem]" : "w-14",
        selected ? "text-accent-deep" : "text-ink hover:bg-ink/[0.03]",
      )}
    >
      {selected && (
        <motion.span
          layoutId="itinerary-day"
          className="absolute inset-0 rounded-xl bg-accent/12 ring-1 ring-inset ring-accent/30"
          transition={spring}
        />
      )}
      <span className="relative z-10 flex flex-col items-center gap-1">
        <span
          className={cn(
            "text-[0.6rem] font-medium uppercase tracking-[0.1em]",
            highlightLabel
              ? "text-accent-deep"
              : selected
                ? "text-accent-deep/70"
                : "text-ink-soft",
          )}
        >
          {label}
        </span>
        {children}
        <span className="flex h-2 items-center justify-center gap-0.5">
          {dots.slice(0, 4).map((c, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
      </span>
    </button>
  );
}
