"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import { parseISO } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useTrips } from "@/lib/trips/store";
import { effectiveStatus, formatDateRange } from "@/lib/trips/types";
import { useSpace } from "@/lib/space/store";
import type { Trip } from "@/lib/trips/types";

type Mode = "countdown" | "together" | "empty";

function breakdown(ms: number) {
  const c = Math.max(0, ms);
  return {
    d: Math.floor(c / 86_400_000),
    h: Math.floor((c % 86_400_000) / 3_600_000),
    m: Math.floor((c % 3_600_000) / 60_000),
    s: Math.floor((c % 60_000) / 1_000),
  };
}

/**
 * The heart of the home screen: a live countdown to the next time the two of
 * you are in the same place. Picks the trip that's happening now (→ "together")
 * or the soonest upcoming one; falls back to a gentle invite when the calendar
 * is empty. The numbers only tick after mount so SSR can't mismatch.
 */
export function ReunionHero() {
  const reduce = useReducedMotion();
  const { trips } = useTrips();
  const { you, partner } = useSpace();
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cheap to recompute each tick (a handful of trips): the active trip means
  // you're together; otherwise the soonest upcoming one is the reunion.
  const ref = now ?? new Date();
  const active = trips.find((t) => effectiveStatus(t, ref) === "active") ?? null;
  const upcoming = trips
    .filter((t) => t.start_date && effectiveStatus(t, ref) === "upcoming")
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  const trip: Trip | null = active ?? upcoming[0] ?? null;
  const mode: Mode = active ? "together" : upcoming[0] ? "countdown" : "empty";

  const parts =
    mode === "countdown" && trip?.start_date && now
      ? breakdown(parseISO(trip.start_date).getTime() - now.getTime())
      : null;

  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-7 pb-8 sm:px-8">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-accent-deep">
          {mode === "together" ? "Together now" : "Next reunion"}
        </p>

        <Connector reduce={!!reduce} together={mode === "together"} you={you} partner={partner} />

        {mode === "empty" && (
          <>
            <h2 className="text-center text-[1.65rem] leading-tight">
              No dates on the calendar yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-center text-ink-soft text-balance">
              Plan your first trip together and the countdown to being in the
              same place lands right here.
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/trips" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Plan your first trip
                <ArrowRight size={18} strokeWidth={1.75} />
              </Link>
            </div>
          </>
        )}

        {mode === "together" && trip && (
          <>
            <h2 className="text-center text-[1.65rem] leading-tight text-balance">
              You&rsquo;re in {trip.destination ?? trip.title} together
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-center text-ink-soft">
              {formatDateRange(trip.start_date, trip.end_date)} · soak up every minute.
            </p>
            <div className="mt-7 flex justify-center">
              <Link
                href={`/trips/${trip.id}`}
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                Open the trip
                <ArrowRight size={18} strokeWidth={1.75} />
              </Link>
            </div>
          </>
        )}

        {mode === "countdown" && trip && (
          <>
            <h2 className="text-center text-[1.5rem] leading-tight text-balance">
              {trip.destination ?? trip.title}
            </h2>
            <p className="mt-1.5 text-center text-sm text-ink-soft tabular-nums">
              {formatDateRange(trip.start_date, trip.end_date)}
            </p>

            <div className="mt-7 flex items-start justify-center gap-4 sm:gap-7">
              <Unit value={parts?.d ?? null} label="Days" wide />
              <Unit value={parts?.h ?? null} label="Hours" />
              <Unit value={parts?.m ?? null} label="Min" />
              <Unit value={parts?.s ?? null} label="Sec" />
            </div>

            <div className="mt-7 flex justify-center">
              <Link
                href={`/trips/${trip.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                See the plan
                <ArrowRight size={15} strokeWidth={1.75} />
              </Link>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Unit({
  value,
  label,
  wide = false,
}: {
  value: number | null;
  label: string;
  wide?: boolean;
}) {
  const text =
    value == null ? "––" : wide ? String(value) : String(value).padStart(2, "0");
  return (
    <div className="flex min-w-[2.5rem] flex-col items-center">
      <span
        className="text-[2.1rem] leading-none tabular-nums tracking-tight text-ink sm:text-[2.5rem]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 480 }}
      >
        {text}
      </span>
      <span className="eyebrow mt-2.5 text-[0.6rem]">{label}</span>
    </div>
  );
}

/** The two-of-us, separated-by-distance motif above the headline. */
function Connector({
  reduce,
  together,
  you,
  partner,
}: {
  reduce: boolean;
  together: boolean;
  you: { name: string };
  partner: { name: string };
}) {
  return (
    <div className="mt-7 mb-7 flex items-center justify-center">
      <Avatar name={you.name} size={56} className="bg-clay/15 ring-clay/20" />
      <div className={together ? "relative mx-2 h-px w-12" : "relative mx-2 h-px w-[110px]"}>
        {!together && (
          <div className="absolute inset-0 border-t border-dashed border-line" />
        )}
        <motion.span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface p-1.5 ring-1 ring-line"
          animate={reduce || together ? undefined : { y: [0, -3, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart
            size={14}
            strokeWidth={1.75}
            className="text-clay"
            style={together ? { fill: "var(--color-clay)" } : undefined}
          />
        </motion.span>
      </div>
      <Avatar name={partner.name} size={56} className="bg-sage/20 ring-sage/30" />
    </div>
  );
}
