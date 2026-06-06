"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { useTripForecast } from "@/lib/weather/use-trip-forecast";
import { formatTemp, toneColor, weatherInfo } from "@/lib/weather/types";
import type { DailyForecast } from "@/lib/weather/types";
import { effectiveStatus, type Trip } from "@/lib/trips/types";

/**
 * A glanceable forecast for the trip's days, above the itinerary. Keyless
 * (Open-Meteo); the Lisbon sample is seeded so it's alive offline. Self-hides
 * when there's nothing worth showing (a daydream, a memory, or a network miss),
 * and offers a gentle line for trips still beyond the forecast horizon.
 */
export function WeatherStrip({ trip }: { trip: Trip }) {
  const reduce = useReducedMotion();
  const { days, status, place } = useTripForecast(trip);

  if (status === "loading") {
    return (
      <section aria-hidden className="space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[5.25rem] w-[4.25rem] shrink-0 animate-pulse rounded-xl bg-surface-2"
            />
          ))}
        </div>
      </section>
    );
  }

  // Beyond the ~2-week horizon but still to come — a calm placeholder, not an error.
  if (status === "out-of-range" && effectiveStatus(trip) === "upcoming") {
    return (
      <p className="rounded-card border border-line bg-surface-2/50 px-3.5 py-2.5 text-sm text-ink-soft text-balance">
        The forecast opens about two weeks out. For now, it&apos;s a clean slate.
      </p>
    );
  }

  if (status !== "ready" || days.length === 0) return null;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">The forecast</p>
        {place && (
          <p className="truncate text-xs text-ink-soft">{place.name}</p>
        )}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <ForecastChip key={d.date} day={d} />
        ))}
      </div>
    </motion.section>
  );
}

function ForecastChip({ day }: { day: DailyForecast }) {
  const info = weatherInfo(day.code);
  const Icon = info.icon;
  const date = parseISO(day.date);
  const weekday = Number.isNaN(date.getTime()) ? "" : format(date, "EEE");
  const dayNum = Number.isNaN(date.getTime()) ? "" : format(date, "d");
  const wet = day.precipProb != null && day.precipProb >= 30;

  return (
    <div
      className="flex min-w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-xl border border-line bg-surface/70 px-2.5 py-2.5"
      title={info.label}
    >
      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-ink-soft">
        {weekday} {dayNum}
      </span>
      <Icon
        size={20}
        strokeWidth={1.75}
        style={{ color: toneColor(info.tone) }}
        aria-label={info.label}
      />
      <span className="text-sm tabular-nums text-ink">
        {formatTemp(day.tempMax)}
        <span className="text-ink-soft/60"> {formatTemp(day.tempMin)}</span>
      </span>
      {wet && (
        <span className="text-[0.65rem] tabular-nums text-sage">
          {day.precipProb}%
        </span>
      )}
    </div>
  );
}
