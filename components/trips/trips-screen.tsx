"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useTrips } from "@/lib/trips/store";
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
  const { trips, ready, createTrip } = useTrips();
  const [creating, setCreating] = React.useState(false);

  const sorted = sortTripsForList(trips);
  const groups = GROUPS.map((g) => ({
    ...g,
    items: sorted.filter((t) => effectiveStatus(t) === g.status),
  })).filter((g) => g.items.length > 0);

  const isEmpty = ready && trips.length === 0;

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
    </div>
  );
}
