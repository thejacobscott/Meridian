"use client";

import * as React from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Images,
  Luggage,
  Map as MapIcon,
  Pencil,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { deepFor } from "@/lib/trips/accents";
import { fadeUp, spring, staggerContainer } from "@/lib/motion";
import { useTrips } from "@/lib/trips/store";
import {
  daysUntilStart,
  effectiveStatus,
  formatDateRange,
  shortCountdown,
  tripNights,
  type Trip,
  type TripDraft,
} from "@/lib/trips/types";
import { ItineraryTab } from "@/components/itinerary/itinerary-tab";
import { BalanceTab } from "@/components/itinerary/balance-tab";
import { MemoryTab } from "@/components/memory/memory-tab";
import { CoverImage } from "./cover-image";
import { StatusPill } from "./status-pill";
import { TripForm } from "./trip-form";

const TABS: { id: string; label: string; icon: LucideIcon; blurb: string }[] = [
  {
    id: "itinerary",
    label: "Itinerary",
    icon: CalendarDays,
    blurb: "Lay out each day together — mornings, meals, and the slow afternoons in between.",
  },
  {
    id: "balance",
    label: "Balance",
    icon: Scale,
    blurb: "Track who paid for what and settle up without a single awkward conversation.",
  },
  {
    id: "map",
    label: "Map",
    icon: MapIcon,
    blurb: "Every stay, meal, and sight as a pin — the whole trip at a glance.",
  },
  {
    id: "memory",
    label: "Memory",
    icon: Images,
    blurb: "Photos and notes that quietly turn this trip into a scrapbook you keep forever.",
  },
  {
    id: "budget",
    label: "Budget",
    icon: Wallet,
    blurb: "Set a number for the trip and watch it fill in as the plans take shape.",
  },
  {
    id: "packing",
    label: "Packing",
    icon: Luggage,
    blurb: "Shared checklists, so between the two of you nothing gets left behind.",
  },
];

export function TripDetail({ id }: { id: string }) {
  const { getTrip, ready, updateTrip, deleteTrip } = useTrips();
  const trip = getTrip(id);

  if (!ready) return <DetailSkeleton />;
  if (!trip) return <NotFound />;

  return <TripDetailView trip={trip} updateTrip={updateTrip} deleteTrip={deleteTrip} />;
}

function TripDetailView({
  trip,
  updateTrip,
  deleteTrip,
}: {
  trip: Trip;
  updateTrip: (id: string, draft: TripDraft) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const headerRef = React.useRef<HTMLDivElement>(null);
  // A trip you've already taken opens to its memories; everything else to the plan.
  const [tab, setTab] = React.useState(() =>
    effectiveStatus(trip) === "past" ? "memory" : TABS[0].id,
  );
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });
  const rawY = useTransform(scrollYProgress, [0, 1], [0, 64]);
  const y = reduce ? 0 : rawY;

  const status = effectiveStatus(trip);
  const days =
    status === "upcoming" ? daysUntilStart(trip.start_date) : null;
  const countdown = days != null && days >= 0 ? shortCountdown(days) : null;
  const nights = tripNights(trip.start_date, trip.end_date);
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div
      style={
        {
          "--accent": trip.accent_color,
          "--accent-deep": deepFor(trip.accent_color),
        } as React.CSSProperties
      }
    >
      {/* Full-bleed header — breaks out of the column padding. */}
      <div
        ref={headerRef}
        className="relative -mx-5 -mt-6 h-[60svh] min-h-[380px] max-h-[560px] overflow-hidden sm:-mx-6"
      >
        <ViewTransition name={`trip-cover-${trip.id}`}>
          <div className="absolute inset-0">
            <motion.div className="absolute inset-0 scale-[1.15]" style={{ y }}>
              <CoverImage
                src={trip.cover_photo_url}
                accent={trip.accent_color}
                alt={trip.title}
                overlay
                className="h-full w-full"
              />
            </motion.div>
          </div>
        </ViewTransition>

        {/* Controls + title sit above the cover but outside the morph. */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/trips"
            aria-label="Back to trips"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-ink shadow-soft ring-1 ring-white/40 backdrop-blur-md transition hover:bg-surface"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Link>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface/80 px-4 text-sm font-medium text-ink shadow-soft ring-1 ring-white/40 backdrop-blur-md transition hover:bg-surface"
          >
            <Pencil size={15} strokeWidth={1.75} />
            Edit
          </button>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="absolute inset-x-0 bottom-0 p-5 sm:p-6"
        >
          <StatusPill status={status} variant="glass" />
          {trip.destination && (
            <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-paper/85">
              {trip.destination}
            </p>
          )}
          <h1 className="mt-1.5 text-[2.4rem] leading-[1.05] tracking-[-0.02em] text-paper drop-shadow-sm sm:text-[2.9rem]">
            {trip.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-paper/90">
            <span className="tabular-nums">
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
            {countdown && (
              <>
                <Dot />
                <span className="tabular-nums">{countdown}</span>
              </>
            )}
            {!countdown && nights > 0 && (
              <>
                <Dot />
                <span className="tabular-nums">
                  {nights} {nights === 1 ? "night" : "nights"}
                </span>
              </>
            )}
          </p>
        </motion.div>
      </div>

      {/* Sub-tabs */}
      <nav
        role="tablist"
        aria-label="Trip sections"
        className="no-scrollbar -mx-5 mt-5 flex gap-1 overflow-x-auto px-5 sm:-mx-6 sm:px-6"
      >
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              onClick={() => setTab(t.id)}
              aria-selected={on}
              className={cn(
                "relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                on ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {on && (
                <motion.span
                  layoutId="trip-tab"
                  className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-line"
                  transition={spring}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <t.icon size={15} strokeWidth={1.75} />
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Tab panel */}
      <div className="mt-6 min-h-[260px]">
        <AnimatePresence mode="wait">
          {active.id === "itinerary" ? (
            <motion.div
              key="itinerary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.25 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <ItineraryTab trip={trip} />
            </motion.div>
          ) : active.id === "balance" ? (
            <motion.div
              key="balance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.25 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <BalanceTab trip={trip} />
            </motion.div>
          ) : active.id === "memory" ? (
            <motion.div
              key="memory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.25 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <MemoryTab trip={trip} />
            </motion.div>
          ) : (
            <motion.section
              key={active.id}
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="rounded-card border border-line bg-surface px-7 py-12 text-center shadow-soft"
            >
              <motion.span
                variants={fadeUp}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent-deep"
              >
                <active.icon size={24} strokeWidth={1.5} />
              </motion.span>
              <motion.h2 variants={fadeUp} className="mt-5 text-xl">
                {active.label}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mx-auto mt-2 max-w-sm text-ink-soft text-balance"
              >
                {active.blurb}
              </motion.p>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-xs uppercase tracking-[0.16em] text-ink-soft/60"
              >
                Coming soon
              </motion.p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Edit */}
      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit trip">
        <TripForm
          trip={trip}
          onSubmit={(draft) => updateTrip(trip.id, draft)}
          onDone={() => setEditing(false)}
          onDelete={() => {
            setEditing(false);
            setConfirmDelete(true);
          }}
        />
      </Sheet>

      {/* Delete confirm */}
      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this trip?"
      >
        <p className="text-ink-soft text-balance">
          {trip.title} and everything in it will be gone for good. This can&apos;t
          be undone.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(false)}
            className="flex-1"
          >
            Keep it
          </Button>
          <button
            type="button"
            onClick={async () => {
              await deleteTrip(trip.id);
              router.replace("/trips");
            }}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-clay px-5 text-[0.95rem] font-medium text-white shadow-soft transition active:scale-[0.97]"
          >
            Delete forever
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Dot() {
  return <span className="text-paper/50">·</span>;
}

function DetailSkeleton() {
  return (
    <div>
      <div className="-mx-5 -mt-6 h-[60svh] min-h-[380px] max-h-[560px] animate-pulse bg-surface-2 sm:-mx-6" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded-full bg-surface-2" />
      <div className="mt-6 h-[260px] animate-pulse rounded-card bg-surface-2" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl">This trip wandered off</h1>
      <p className="mx-auto mt-2 max-w-sm text-ink-soft text-balance">
        We couldn&apos;t find it. It may have been deleted from another device.
      </p>
      <Link
        href="/trips"
        className="mt-6 inline-flex items-center gap-1.5 text-accent-deep underline-offset-4 hover:underline"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Back to all trips
      </Link>
    </div>
  );
}
