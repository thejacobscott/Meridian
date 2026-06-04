"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEFAULT_ACCENT } from "./accents";
import { SAMPLE_TRIPS } from "./sample";
import { deriveStatus, type Trip, type TripDraft, type TripStatus } from "./types";

interface TripsContextValue {
  trips: Trip[];
  /** False until the client store has hydrated from storage. */
  ready: boolean;
  getTrip: (id: string) => Trip | undefined;
  createTrip: (draft: TripDraft) => Promise<Trip>;
  updateTrip: (id: string, draft: TripDraft) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;
}

const TripsContext = React.createContext<TripsContextValue | null>(null);

export function useTrips(): TripsContextValue {
  const ctx = React.useContext(TripsContext);
  if (!ctx) throw new Error("useTrips must be used within <TripsProvider>");
  return ctx;
}

/** Reconcile requested status with date-derived status (auto vs. manual override). */
function resolveStatus(
  start: string | null,
  end: string | null,
  requested: TripStatus | null | undefined,
  existing?: Trip,
): Pick<Trip, "status" | "status_override"> {
  if (requested === null)
    return { status: deriveStatus(start, end), status_override: false };
  if (requested) return { status: requested, status_override: true };
  if (existing?.status_override)
    return { status: existing.status, status_override: true };
  return { status: deriveStatus(start, end), status_override: false };
}

function draftToDates(draft: TripDraft, existing?: Trip) {
  return {
    start: draft.start_date ?? existing?.start_date ?? null,
    end: draft.end_date ?? existing?.end_date ?? null,
  };
}

// ---------------------------------------------------------------------------
// Preview backend — local, no Supabase. Seeds sample trips and persists any
// the couple creates to localStorage so the design is fully demoable offline.
// ---------------------------------------------------------------------------
const STORAGE_KEY = "meridian.trips.v1";

function loadFromStorage(): Trip[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Trip[]) : null;
  } catch {
    return null;
  }
}

/** Keep auto (non-overridden) statuses fresh as real time passes. */
function refreshStatuses(trips: Trip[]): Trip[] {
  return trips.map((t) =>
    t.status_override
      ? t
      : { ...t, status: deriveStatus(t.start_date, t.end_date) },
  );
}

function PreviewTripsProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = React.useState<Trip[]>(SAMPLE_TRIPS);
  const [ready, setReady] = React.useState(false);

  // Hydrate from localStorage once on the client, then age statuses. Storage
  // isn't readable during SSR, so this must run post-mount (not in a state
  // initializer) — the synchronous setState here is intentional.
  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrips(refreshStatuses(stored ?? SAMPLE_TRIPS));
    setReady(true);
  }, []);

  // Persist after hydration so we never clobber stored trips with the seed.
  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch {
      // storage full / unavailable — preview persistence is best-effort
    }
  }, [trips, ready]);

  const value = React.useMemo<TripsContextValue>(() => {
    return {
      trips,
      ready,
      getTrip: (id) => trips.find((t) => t.id === id),
      createTrip: async (draft) => {
        const { start, end } = draftToDates(draft);
        const trip: Trip = {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `trip-${Date.now()}`,
          title: draft.title.trim() || "Untitled trip",
          destination: draft.destination?.trim() || null,
          start_date: start,
          end_date: end,
          accent_color: draft.accent_color ?? DEFAULT_ACCENT.color,
          cover_photo_url: draft.cover_photo_url ?? null,
          currency: draft.currency ?? "USD",
          created_at: new Date().toISOString(),
          ...resolveStatus(start, end, draft.status),
        };
        setTrips((prev) => [trip, ...prev]);
        return trip;
      },
      updateTrip: async (id, draft) => {
        let updated: Trip | undefined;
        setTrips((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            const start = draft.start_date !== undefined ? draft.start_date : t.start_date;
            const end = draft.end_date !== undefined ? draft.end_date : t.end_date;
            updated = {
              ...t,
              title: draft.title?.trim() || t.title,
              destination:
                draft.destination !== undefined
                  ? draft.destination?.trim() || null
                  : t.destination,
              start_date: start,
              end_date: end,
              accent_color: draft.accent_color ?? t.accent_color,
              cover_photo_url:
                draft.cover_photo_url !== undefined
                  ? draft.cover_photo_url
                  : t.cover_photo_url,
              currency: draft.currency ?? t.currency,
              ...resolveStatus(start, end, draft.status, t),
            };
            return updated;
          }),
        );
        if (!updated) throw new Error(`Trip ${id} not found`);
        return updated;
      },
      deleteTrip: async (id) => {
        setTrips((prev) => prev.filter((t) => t.id !== id));
      },
    };
  }, [trips, ready]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. When Supabase is configured the real backend (reads, writes,
// Storage-backed covers, realtime) lands with the data sprint; until then the
// app runs on the preview backend above. The context interface stays identical
// so screens never need to know which is behind them.
// ---------------------------------------------------------------------------
export function TripsProvider({ children }: { children: React.ReactNode }) {
  // Reserved for the Supabase-backed provider; preview is the current runtime.
  void isSupabaseConfigured;
  return <PreviewTripsProvider>{children}</PreviewTripsProvider>;
}
