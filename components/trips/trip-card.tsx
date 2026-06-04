"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CoverImage } from "./cover-image";
import { StatusPill } from "./status-pill";
import { deepFor } from "@/lib/trips/accents";
import { fadeUp } from "@/lib/motion";
import {
  daysUntilStart,
  effectiveStatus,
  formatDateRange,
  shortCountdown,
  type Trip,
} from "@/lib/trips/types";

export function TripCard({ trip }: { trip: Trip }) {
  const status = effectiveStatus(trip);
  const days = status === "upcoming" ? daysUntilStart(trip.start_date) : null;
  const countdown = days != null && days >= 0 ? shortCountdown(days) : null;

  return (
    <motion.div variants={fadeUp}>
      <Link
        href={`/trips/${trip.id}`}
        className="group block"
        style={
          {
            "--accent": trip.accent_color,
            "--accent-deep": deepFor(trip.accent_color),
          } as React.CSSProperties
        }
      >
        <ViewTransition name={`trip-cover-${trip.id}`}>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-card shadow-soft ring-1 ring-line/60 transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:shadow-lift">
            <CoverImage
              src={trip.cover_photo_url}
              accent={trip.accent_color}
              alt={trip.title}
              overlay
              className="absolute inset-0 h-full w-full"
            />
            <div className="absolute left-3 top-3">
              <StatusPill status={status} variant="glass" />
            </div>
            {countdown && (
              <div className="absolute bottom-3 left-3 rounded-full bg-surface/80 px-2.5 py-1 text-xs font-medium tabular-nums text-accent-deep ring-1 ring-white/40 backdrop-blur-md">
                {countdown}
              </div>
            )}
          </div>
        </ViewTransition>

        <div className="px-1 pt-3.5">
          {trip.destination && <p className="eyebrow">{trip.destination}</p>}
          <h3 className="mt-1 text-[1.35rem] leading-snug transition-colors group-hover:text-accent-deep">
            {trip.title}
          </h3>
          <p className="mt-1 text-sm tabular-nums text-ink-soft">
            {formatDateRange(trip.start_date, trip.end_date)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
