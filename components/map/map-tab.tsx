"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin } from "lucide-react";
import { categoryById } from "@/lib/itinerary/categories";
import { useTripEvents } from "@/lib/itinerary/store";
import { dayHeading, dayNumber, type ItineraryEvent } from "@/lib/itinerary/types";
import { geocode, seededPlace, type GeoPlace } from "@/lib/geo/geocode";
import { staticMapUrl } from "@/lib/map/env";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type { Trip } from "@/lib/trips/types";

interface Stop {
  id: string;
  location: string;
  title: string;
  date: string | null;
  color: string;
}

/**
 * The Map sub-tab. The star is a keyless, editorial "journey" — the trip's
 * places strung into an ordered route, colored by category. When a Mapbox token
 * is configured (lib/map/env.ts) a quiet, muted map of the destination sits
 * above it; without one, the route stands on its own. No token, no map: still a
 * real, useful view.
 */
export function MapTab({ trip }: { trip: Trip }) {
  const reduce = useReducedMotion();
  const { events } = useTripEvents(trip.id);

  const [place, setPlace] = React.useState<GeoPlace | null>(() =>
    seededPlace(trip.destination ?? ""),
  );

  // Geocode the destination for the map center / header — async, so no flash and
  // no synchronous setState. Seeded sample destinations skip this entirely.
  React.useEffect(() => {
    if (place || !trip.destination) return;
    let cancelled = false;
    geocode(trip.destination).then((p) => {
      if (!cancelled) setPlace(p);
    });
    return () => {
      cancelled = true;
    };
  }, [trip.destination, place]);

  const stops = React.useMemo(() => buildStops(events), [events]);

  const mapUrl = place
    ? staticMapUrl({
        center: [place.longitude, place.latitude],
        zoom: 11,
        width: 640,
        height: 320,
        markers: [
          {
            lat: place.latitude,
            lng: place.longitude,
            color: trip.accent_color.replace(/^#/, ""),
          },
        ],
      })
    : null;

  const placeName = place?.name ?? trip.destination ?? "Somewhere wonderful";

  return (
    <div className="space-y-5">
      {mapUrl && (
        <figure className="overflow-hidden rounded-card border border-line shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapUrl}
            alt={`A map of ${placeName}`}
            className="block aspect-[2/1] w-full object-cover"
            loading="lazy"
          />
        </figure>
      )}

      <header className="space-y-1">
        <p className="eyebrow">The journey</p>
        <h3 className="text-xl leading-tight">{placeName}</h3>
        <p className="text-sm text-ink-soft">
          {stops.length === 0
            ? place?.country ?? "Map out where you'll wander"
            : `${stops.length} ${stops.length === 1 ? "stop" : "stops"}${
                place?.country ? ` · ${place.country}` : ""
              }`}
        </p>
      </header>

      {stops.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface/40 px-7 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
            <MapPin size={22} strokeWidth={1.5} />
          </span>
          <h3 className="mt-4 text-lg">No places pinned yet</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft text-balance">
            Add a spot to anything on the itinerary — a café, a viewpoint, a
            street — and your route takes shape here.
          </p>
        </div>
      ) : (
        <motion.ol
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="relative list-none"
        >
          {stops.map((s, i) => (
            <Stop
              key={s.id}
              stop={s}
              start={trip.start_date}
              last={i === stops.length - 1}
              reduce={!!reduce}
            />
          ))}
        </motion.ol>
      )}
    </div>
  );
}

function Stop({
  stop,
  start,
  last,
  reduce,
}: {
  stop: Stop;
  start: string | null;
  last: boolean;
  reduce: boolean;
}) {
  const label = stop.date
    ? (() => {
        const n = dayNumber(stop.date, start);
        return n ? `Day ${n} · ${dayHeading(stop.date)}` : dayHeading(stop.date);
      })()
    : "An idea, unplaced";

  return (
    <motion.li
      variants={reduce ? undefined : fadeUp}
      className="relative flex gap-4 pb-6 last:pb-0"
    >
      {!last && (
        <span
          className="absolute left-[11px] top-7 bottom-0 w-px bg-line"
          aria-hidden="true"
        />
      )}
      <span
        className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-surface"
        style={{ borderColor: stop.color }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: stop.color }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{stop.location}</p>
        <p className="truncate text-sm text-ink-soft">{stop.title}</p>
        <p className="mt-0.5 text-xs text-ink-soft/70">{label}</p>
      </div>
    </motion.li>
  );
}

/** Events that have a place, in itinerary order: scheduled days first, ideas last. */
function buildStops(events: ItineraryEvent[]): Stop[] {
  return events
    .filter((e) => e.location_name && e.location_name.trim() !== "")
    .slice()
    .sort((a, b) => {
      // Nulls (ideas) sort after dated stops.
      if (a.date !== b.date) {
        if (a.date === null) return 1;
        if (b.date === null) return -1;
        return a.date.localeCompare(b.date);
      }
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at.localeCompare(b.created_at);
    })
    .map((e) => ({
      id: e.id,
      location: e.location_name!.trim(),
      title: e.title,
      date: e.date,
      color: categoryById(e.category_id)?.color ?? "var(--color-line)",
    }));
}
