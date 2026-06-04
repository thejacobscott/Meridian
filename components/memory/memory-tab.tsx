"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Images } from "lucide-react";
import { useTripMemory } from "@/lib/memory/store";
import { summarizeTripMemory, type PhotoRecord } from "@/lib/memory/types";
import { tripDays } from "@/lib/itinerary/types";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type { Trip } from "@/lib/trips/types";
import { DayEntry } from "./day-entry";

/**
 * Memory mode — the scrapbook. A vertical journal, one entry per day of the
 * trip: rating, note, and photos. The same view serves an upcoming trip (empty
 * days waiting to be filled) and a past one (its memories already in place);
 * past trips open straight to this tab from trip-detail.
 */
export function MemoryTab({ trip }: { trip: Trip }) {
  const reduce = useReducedMotion();
  const { days, photos } = useTripMemory(trip.id);

  const dates = React.useMemo(
    () => tripDays(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date],
  );

  const dayMap = React.useMemo(
    () => new Map(days.map((d) => [d.date, d])),
    [days],
  );

  const photosByDate = React.useMemo(() => {
    const map = new Map<string, PhotoRecord[]>();
    for (const p of photos) {
      if (!p.date) continue;
      const list = map.get(p.date);
      if (list) list.push(p);
      else map.set(p.date, [p]);
    }
    return map;
  }, [photos]);

  const summary = summarizeTripMemory(days, photos);

  if (dates.length === 0) {
    return <EmptyState />;
  }

  const parts: string[] = [];
  if (summary.photoCount > 0) {
    parts.push(`${summary.photoCount} ${summary.photoCount === 1 ? "photo" : "photos"}`);
  }
  if (summary.daysWithContent > 0) {
    parts.push(
      `${summary.daysWithContent} ${summary.daysWithContent === 1 ? "day" : "days"} remembered`,
    );
  }
  const intro = parts.length
    ? parts.join(" · ")
    : "This scrapbook's empty for now — add a photo or a few words to any day below, and it keeps.";

  return (
    <div className="space-y-7">
      <p className="text-sm text-ink-soft text-balance">{intro}</p>

      <motion.div
        variants={staggerContainer}
        initial={reduce ? false : "initial"}
        animate="animate"
        className="space-y-8"
      >
        {dates.map((date) => (
          <motion.div
            key={date}
            variants={fadeUp}
            className="border-b border-line/70 pb-8 last:border-0 last:pb-0"
          >
            <DayEntry
              tripId={trip.id}
              startDate={trip.start_date}
              date={date}
              day={dayMap.get(date) ?? null}
              photos={photosByDate.get(date) ?? []}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface/40 px-7 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
        <Images size={22} strokeWidth={1.5} />
      </span>
      <h3 className="mt-4 text-lg">No days to remember yet</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft text-balance">
        Once this trip has dates, each day shows up here to fill with photos and
        a few words.
      </p>
    </div>
  );
}
