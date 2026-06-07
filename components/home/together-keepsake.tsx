"use client";

import * as React from "react";
import { useTrips } from "@/lib/trips/store";
import { effectiveStatus, tripNights } from "@/lib/trips/types";

/**
 * A quiet keepsake line for the Memories section: how many days the two of them
 * have actually spent together, totalled from finished trips. Hides itself until
 * there's a past trip to count. Derived from existing trip data — no backend.
 */
export function TogetherKeepsake() {
  const { trips, ready } = useTrips();

  const stat = React.useMemo(() => {
    const past = trips.filter(
      (t) => effectiveStatus(t) === "past" && t.start_date && t.end_date,
    );
    if (past.length === 0) return null;
    const days = past.reduce(
      (sum, t) => sum + tripNights(t.start_date, t.end_date) + 1,
      0,
    );
    return { days, trips: past.length };
  }, [trips]);

  if (!ready || !stat) return null;

  return (
    <p className="text-sm text-ink-soft">
      <span className="font-medium tabular-nums text-ink">{stat.days}</span> days
      together so far · {stat.trips} {stat.trips === 1 ? "trip" : "trips"}{" "}
      remembered
    </p>
  );
}
