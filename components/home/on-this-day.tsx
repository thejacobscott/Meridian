"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarHeart } from "lucide-react";
import { format, parseISO } from "date-fns";
import { RatingStars } from "@/components/memory/rating-stars";
import { deepFor } from "@/lib/trips/accents";
import { findOnThisDay, yearsAgoLabel } from "@/lib/memory/on-this-day";
import { useMemory } from "@/lib/memory/store";
import { useTrips } from "@/lib/trips/store";

/**
 * "On this day" — when today lines up with a day from a past trip, a quiet card
 * surfaces that memory on Home: where you were a year (or more) ago, with the
 * note you wrote if there is one. Most days nothing matches and it renders
 * nothing at all — a small recurring delight, never a fixture.
 */
export function OnThisDay() {
  const reduce = useReducedMotion();
  const { trips, ready: tripsReady } = useTrips();
  const { getTripDays, ready: memoryReady } = useMemory();

  const hit = React.useMemo(() => {
    if (!tripsReady || !memoryReady) return null;
    return findOnThisDay(trips, getTripDays);
  }, [trips, getTripDays, tripsReady, memoryReady]);

  if (!hit) return null;

  const { trip, date, yearsAgo, note, rating } = hit;
  const accent = trip.accent_color;
  const accentDeep = deepFor(accent);
  const parsed = parseISO(date);
  const when = Number.isNaN(parsed.getTime())
    ? ""
    : format(parsed, "EEEE, MMMM d");
  const place = trip.destination ?? trip.title;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        href={`/trips/${trip.id}`}
        className="group block rounded-card border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift"
      >
        <div className="flex items-start gap-4 px-6 py-6">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}1f`, color: accentDeep }}
          >
            <CalendarHeart size={20} strokeWidth={1.6} />
          </span>

          <div className="min-w-0 flex-1">
            <p
              className="text-[0.6875rem] font-medium uppercase tracking-[0.18em]"
              style={{ color: accentDeep }}
            >
              {yearsAgoLabel(yearsAgo)}
            </p>
            <h2 className="mt-1 text-xl leading-snug text-balance">
              You were in {place}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <p className="text-sm text-ink-soft tabular-nums">{when}</p>
              {rating != null && (
                <RatingStars value={rating} size={13} />
              )}
            </div>

            {note && (
              <p
                className="mt-3 border-l-2 pl-3 text-[0.95rem] leading-relaxed text-ink-soft text-balance line-clamp-3"
                style={{ borderColor: accent, fontFamily: "var(--font-display)" }}
              >
                {note}
              </p>
            )}

            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors group-hover:text-ink">
              Revisit this day
              <ArrowRight
                size={15}
                strokeWidth={1.75}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </div>
      </Link>
    </motion.section>
  );
}
