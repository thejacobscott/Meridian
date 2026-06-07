"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useTrips } from "@/lib/trips/store";
import { isSampleTrip } from "@/lib/trips/sample";
import { staggerContainer } from "@/lib/motion";
import {
  effectiveStatus,
  sortTripsForList,
  type TripStatus,
} from "@/lib/trips/types";
import { TripCard } from "./trip-card";
import { TripForm } from "./trip-form";

const GROUPS: { status: TripStatus; eyebrow: string; title: string }[] = [
  { status: "active", eyebrow: "Right now", title: "Happening now" },
  { status: "upcoming", eyebrow: "Counting down", title: "On the horizon" },
  { status: "dreaming", eyebrow: "Someday", title: "Daydreams" },
  { status: "past", eyebrow: "Kept forever", title: "Memories" },
];

export function TripsScreen() {
  const { trips, ready, createTrip, deleteTrip } = useTrips();
  const [creating, setCreating] = React.useState(false);
  const [confirmFresh, setConfirmFresh] = React.useState(false);

  const sorted = sortTripsForList(trips);
  const groups = GROUPS.map((g) => ({
    ...g,
    items: sorted.filter((t) => effectiveStatus(t) === g.status),
  })).filter((g) => g.items.length > 0);

  const isEmpty = ready && trips.length === 0;
  const sampleTrips = trips.filter(isSampleTrip);
  const hasSamples = ready && sampleTrips.length > 0;

  // "Start fresh" only clears the demo trips — anything the couple added stays.
  const clearSamples = async () => {
    setConfirmFresh(false);
    await Promise.all(sampleTrips.map((t) => deleteTrip(t.id)));
  };

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <p className="eyebrow">Trips</p>
          <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
            Dream, plan, remember
          </h1>
        </div>
        <Button
          type="button"
          onClick={() => setCreating(true)}
          className="shrink-0"
        >
          <Plus size={18} strokeWidth={1.75} />
          New trip
        </Button>
      </header>

      {hasSamples && (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-2/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft text-balance">
            These are example trips, here for you to explore. Clear them whenever
            you&apos;re ready to make Meridian your own.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmFresh(true)}
            className="shrink-0 self-start sm:self-auto"
          >
            Start fresh
          </Button>
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          icon={<Map size={24} strokeWidth={1.5} />}
          title="No trips yet"
          body="Every trip starts as a daydream. The one you plan here grows into a day-by-day itinerary, then a scrapbook you keep forever."
          action={
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus size={18} strokeWidth={1.75} />
              Plan your first trip
            </Button>
          }
        />
      ) : (
        <div className="space-y-12">
          {groups.map((g) => (
            <section key={g.status} className="space-y-5">
              <div>
                <p className="eyebrow">{g.eyebrow}</p>
                <h2 className="mt-1 text-xl">{g.title}</h2>
              </div>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2"
              >
                <AnimatePresence initial={false}>
                  {g.items.map((t) => (
                    <TripCard key={t.id} trip={t} />
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          ))}
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New trip"
      >
        <TripForm
          onSubmit={createTrip}
          onDone={() => setCreating(false)}
        />
      </Sheet>

      <Sheet
        open={confirmFresh}
        onClose={() => setConfirmFresh(false)}
        title="Start fresh?"
      >
        <p className="text-ink-soft text-balance">
          The {sampleTrips.length} example{" "}
          {sampleTrips.length === 1 ? "trip" : "trips"} will be cleared so you
          can begin with a blank slate. Anything you&apos;ve added yourself
          stays.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmFresh(false)}
            className="flex-1"
          >
            Keep them
          </Button>
          <Button type="button" onClick={clearSamples} className="flex-1">
            Clear examples
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
