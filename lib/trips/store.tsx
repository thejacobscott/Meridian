"use client";

import * as React from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { useSpace } from "@/lib/space/store";
import { previewKey } from "@/lib/preview/hubs";
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
    const raw = window.localStorage.getItem(previewKey(STORAGE_KEY));
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
      window.localStorage.setItem(previewKey(STORAGE_KEY), JSON.stringify(trips));
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
          budget: draft.budget ?? null,
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
              budget: draft.budget !== undefined ? draft.budget : t.budget,
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
// Supabase backend. Trips are space-scoped: an initial select seeds state, then
// a realtime channel (postgres_changes, RLS-scoped to this space) keeps both
// devices in sync. Writes are optimistic and reconcile against the realtime
// echo by id — client-generated UUIDs make the optimistic row and its echo the
// same row, so the echo is a no-op replace rather than a duplicate.
// ---------------------------------------------------------------------------
function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `trip-${Date.now()}`;
}

function rowToTrip(r: Tables<"trips">): Trip {
  return {
    id: r.id,
    title: r.title,
    destination: r.destination,
    start_date: r.start_date,
    end_date: r.end_date,
    status: r.status,
    status_override: r.status_override,
    accent_color: r.accent_color ?? DEFAULT_ACCENT.color,
    cover_photo_url: r.cover_photo_url,
    currency: r.currency,
    budget: r.budget,
    created_at: r.created_at,
  };
}

/** Fold a realtime row change into local state, keyed by id (optimistic-safe). */
function reconcileTrips(
  prev: Trip[],
  payload: RealtimePostgresChangesPayload<Tables<"trips">>,
): Trip[] {
  if (payload.eventType === "DELETE") {
    const id = (payload.old as Partial<Tables<"trips">>).id;
    return id ? prev.filter((t) => t.id !== id) : prev;
  }
  const trip = rowToTrip(payload.new);
  return prev.some((t) => t.id === trip.id)
    ? prev.map((t) => (t.id === trip.id ? trip : t))
    : [trip, ...prev];
}

function SupabaseTripsProvider({
  spaceId,
  userId,
  children,
}: {
  spaceId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [ready, setReady] = React.useState(false);

  // Initial load + live channel. RLS already scopes rows to this space; the
  // space_id filter is a fast-path so the socket only carries our trips.
  React.useEffect(() => {
    const supabase = getBrowserClient();
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("space_id", spaceId);
      if (!active) return;
      setTrips((data ?? []).map(rowToTrip));
      setReady(true);
    })();

    const channel = supabase
      .channel(`trips:${spaceId}`)
      .on<Tables<"trips">>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => setTrips((prev) => reconcileTrips(prev, payload)),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [spaceId]);

  const value = React.useMemo<TripsContextValue>(() => {
    const supabase = getBrowserClient();
    return {
      trips,
      ready,
      getTrip: (id) => trips.find((t) => t.id === id),
      createTrip: async (draft) => {
        const { start, end } = draftToDates(draft);
        const trip: Trip = {
          id: newId(),
          title: draft.title.trim() || "Untitled trip",
          destination: draft.destination?.trim() || null,
          start_date: start,
          end_date: end,
          accent_color: draft.accent_color ?? DEFAULT_ACCENT.color,
          cover_photo_url: draft.cover_photo_url ?? null,
          currency: draft.currency ?? "USD",
          budget: draft.budget ?? null,
          created_at: new Date().toISOString(),
          ...resolveStatus(start, end, draft.status),
        };
        setTrips((prev) => [trip, ...prev]);
        const { error } = await supabase.from("trips").insert({
          id: trip.id,
          space_id: spaceId,
          created_by: userId,
          title: trip.title,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          accent_color: trip.accent_color,
          cover_photo_url: trip.cover_photo_url,
          currency: trip.currency,
          budget: trip.budget,
          status: trip.status,
          status_override: trip.status_override,
        });
        if (error) {
          setTrips((prev) => prev.filter((t) => t.id !== trip.id));
          throw error;
        }
        return trip;
      },
      updateTrip: async (id, draft) => {
        const previous = trips.find((t) => t.id === id);
        if (!previous) throw new Error(`Trip ${id} not found`);
        const start =
          draft.start_date !== undefined ? draft.start_date : previous.start_date;
        const end =
          draft.end_date !== undefined ? draft.end_date : previous.end_date;
        const updated: Trip = {
          ...previous,
          title: draft.title?.trim() || previous.title,
          destination:
            draft.destination !== undefined
              ? draft.destination?.trim() || null
              : previous.destination,
          start_date: start,
          end_date: end,
          accent_color: draft.accent_color ?? previous.accent_color,
          cover_photo_url:
            draft.cover_photo_url !== undefined
              ? draft.cover_photo_url
              : previous.cover_photo_url,
          currency: draft.currency ?? previous.currency,
          budget: draft.budget !== undefined ? draft.budget : previous.budget,
          ...resolveStatus(start, end, draft.status, previous),
        };
        setTrips((prev) => prev.map((t) => (t.id === id ? updated : t)));
        const { error } = await supabase
          .from("trips")
          .update({
            title: updated.title,
            destination: updated.destination,
            start_date: updated.start_date,
            end_date: updated.end_date,
            accent_color: updated.accent_color,
            cover_photo_url: updated.cover_photo_url,
            currency: updated.currency,
            budget: updated.budget,
            status: updated.status,
            status_override: updated.status_override,
          })
          .eq("id", id);
        if (error) {
          setTrips((prev) => prev.map((t) => (t.id === id ? previous : t)));
          throw error;
        }
        return updated;
      },
      deleteTrip: async (id) => {
        const removed = trips.find((t) => t.id === id);
        setTrips((prev) => prev.filter((t) => t.id !== id));
        const { error } = await supabase.from("trips").delete().eq("id", id);
        if (error) {
          if (removed)
            setTrips((prev) =>
              prev.some((t) => t.id === id) ? prev : [removed, ...prev],
            );
          throw error;
        }
      },
    };
  }, [trips, ready, spaceId, userId]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. Real backend when Supabase is configured and the space is
// resolved (spaceId/userId come from the SpaceProvider above); otherwise the
// preview backend. The context interface is identical either way, so screens
// never need to know which is behind them.
// ---------------------------------------------------------------------------
export function TripsProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, userId } = useSpace();
  if (isSupabaseConfigured && spaceId && userId) {
    return (
      <SupabaseTripsProvider spaceId={spaceId} userId={userId}>
        {children}
      </SupabaseTripsProvider>
    );
  }
  return <PreviewTripsProvider>{children}</PreviewTripsProvider>;
}
