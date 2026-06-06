"use client";

import * as React from "react";
import { geocode, seededPlace, type GeoPlace } from "@/lib/geo/geocode";
import type { Trip } from "@/lib/trips/types";
import { fetchForecast, forecastWindow } from "./open-meteo";
import { SAMPLE_WEATHER } from "./sample";
import type { DailyForecast } from "./types";

export type ForecastStatus =
  | "idle" // no dates yet (a daydream) — nothing to forecast
  | "loading"
  | "ready"
  | "out-of-range" // past, or further out than the forecast horizon
  | "unavailable"; // couldn't place it / network down

export interface TripForecast {
  days: DailyForecast[];
  status: ForecastStatus;
  place: GeoPlace | null;
}

const SAMPLE_TRIP_ID = "sample-lisbon";

/**
 * Live daily forecast for a trip's days, keyless via Open-Meteo. The Lisbon
 * sample is seeded so preview mode is gorgeous offline; real trips geocode their
 * destination and fetch the overlap of their dates with the forecast horizon.
 * Every failure path resolves to a status the strip can degrade on — it never
 * throws.
 */
export function useTripForecast(trip: Trip): TripForecast {
  const isSample = trip.id === SAMPLE_TRIP_ID;

  const win = React.useMemo(
    () => forecastWindow(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date],
  );

  // Synchronous classification covers every non-fetch case (no setState needed).
  const baseStatus: ForecastStatus = isSample
    ? "ready"
    : !trip.start_date
      ? "idle"
      : !win
        ? "out-of-range"
        : "loading";

  const [fetched, setFetched] = React.useState<{
    days: DailyForecast[];
    place: GeoPlace | null;
    status: "ready" | "unavailable";
  } | null>(null);

  const destination = trip.destination ?? "";

  React.useEffect(() => {
    if (isSample || !win) return; // synchronous base status already covers these
    let cancelled = false;
    (async () => {
      const place = await geocode(destination);
      if (cancelled) return;
      if (!place) {
        setFetched({ days: [], place: null, status: "unavailable" });
        return;
      }
      const days = await fetchForecast(
        place.latitude,
        place.longitude,
        win.start,
        win.end,
      );
      if (cancelled) return;
      setFetched({ days, place, status: days.length ? "ready" : "unavailable" });
    })();
    return () => {
      cancelled = true;
    };
  }, [isSample, win, destination]);

  return React.useMemo<TripForecast>(() => {
    if (isSample) {
      return {
        days: SAMPLE_WEATHER,
        status: "ready",
        place: seededPlace(destination),
      };
    }
    if (fetched) {
      return { days: fetched.days, status: fetched.status, place: fetched.place };
    }
    return { days: [], status: baseStatus, place: null };
  }, [isSample, fetched, baseStatus, destination]);
}
