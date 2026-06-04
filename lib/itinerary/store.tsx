"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SAMPLE_EVENTS } from "./sample";
import {
  byDisplayOrder,
  timeInsertionIndex,
  type EventDraft,
  type ItineraryEvent,
} from "./types";

interface EventsContextValue {
  /** False until the client store has hydrated from storage. */
  ready: boolean;
  /** All of a trip's events (any day), in display order. */
  getEvents: (tripId: string) => ItineraryEvent[];
  createEvent: (tripId: string, draft: EventDraft) => Promise<ItineraryEvent>;
  updateEvent: (id: string, draft: EventDraft) => Promise<ItineraryEvent>;
  deleteEvent: (id: string) => Promise<void>;
  /** Persist a manual within-day reorder (drag). */
  setDayOrder: (tripId: string, date: string | null, orderedIds: string[]) => Promise<void>;
  /** Move an event to another day (or to Unscheduled), landing at its end. */
  moveToDay: (id: string, date: string | null) => Promise<ItineraryEvent>;
}

const EventsContext = React.createContext<EventsContextValue | null>(null);

export function useEvents(): EventsContextValue {
  const ctx = React.useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within <EventsProvider>");
  return ctx;
}

/** Events for one trip, memoized in display order. */
export function useTripEvents(tripId: string): {
  events: ItineraryEvent[];
  ready: boolean;
} {
  const ctx = useEvents();
  const events = React.useMemo(
    () => ctx.getEvents(tripId),
    [ctx, tripId],
  );
  return { events, ready: ctx.ready };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STORAGE_KEY = "meridian.events.v1";

function loadFromStorage(): ItineraryEvent[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ItineraryEvent[]) : null;
  } catch {
    return null;
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inGroup(e: ItineraryEvent, tripId: string, date: string | null): boolean {
  return e.trip_id === tripId && e.date === date;
}

/** Densify one (trip, date) group's sort_order to 0..n, preserving its order. */
function renumberGroup(
  all: ItineraryEvent[],
  tripId: string,
  date: string | null,
): ItineraryEvent[] {
  const group = all.filter((e) => inGroup(e, tripId, date)).sort(byDisplayOrder);
  const order = new Map(group.map((e, i) => [e.id, i]));
  return all.map((e) =>
    order.has(e.id) ? { ...e, sort_order: order.get(e.id)! } : e,
  );
}

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

// ---------------------------------------------------------------------------
// Preview backend — local, no Supabase. Seeds the Lisbon sample itinerary and
// persists any events the couple creates to localStorage.
// ---------------------------------------------------------------------------
function PreviewEventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = React.useState<ItineraryEvent[]>(SAMPLE_EVENTS);
  const [ready, setReady] = React.useState(false);

  // Hydrate from localStorage once, post-mount (storage isn't readable in SSR).
  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setEvents(stored);
    setReady(true);
  }, []);

  // Persist after hydration so we never clobber stored events with the seed.
  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // storage full / unavailable — preview persistence is best-effort
    }
  }, [events, ready]);

  const value = React.useMemo<EventsContextValue>(() => {
    return {
      ready,
      getEvents: (tripId) =>
        events.filter((e) => e.trip_id === tripId).sort(byDisplayOrder),

      createEvent: async (tripId, draft) => {
        const date = draft.date ?? null;
        const event: ItineraryEvent = {
          id: newId(),
          trip_id: tripId,
          date,
          title: draft.title.trim() || "Untitled",
          category_id: draft.category_id ?? null,
          start_time: draft.start_time ?? null,
          end_time: draft.end_time ?? null,
          location_name: cleanStr(draft.location_name),
          notes: cleanStr(draft.notes),
          cost: draft.cost ?? null,
          currency: draft.currency ?? null,
          booking_ref: cleanStr(draft.booking_ref),
          status: draft.status ?? "idea",
          sort_order: 0,
          created_at: new Date().toISOString(),
        };
        setEvents((prev) => {
          const group = prev
            .filter((e) => inGroup(e, tripId, date))
            .sort(byDisplayOrder);
          const idx = timeInsertionIndex(group, event.start_time);
          group.splice(idx, 0, event);
          const others = prev.filter((e) => !inGroup(e, tripId, date));
          const renumbered = group.map((e, i) => ({ ...e, sort_order: i }));
          return [...others, ...renumbered];
        });
        return event;
      },

      updateEvent: async (id, draft) => {
        let result: ItineraryEvent | undefined;
        setEvents((prev) => {
          const existing = prev.find((e) => e.id === id);
          if (!existing) return prev;
          const date = draft.date !== undefined ? draft.date : existing.date;
          const moved = date !== existing.date;
          const updated: ItineraryEvent = {
            ...existing,
            date,
            title:
              draft.title !== undefined
                ? draft.title.trim() || existing.title
                : existing.title,
            category_id:
              draft.category_id !== undefined
                ? draft.category_id
                : existing.category_id,
            start_time:
              draft.start_time !== undefined ? draft.start_time : existing.start_time,
            end_time:
              draft.end_time !== undefined ? draft.end_time : existing.end_time,
            location_name:
              draft.location_name !== undefined
                ? cleanStr(draft.location_name)
                : existing.location_name,
            notes: draft.notes !== undefined ? cleanStr(draft.notes) : existing.notes,
            cost: draft.cost !== undefined ? draft.cost : existing.cost,
            currency: draft.currency !== undefined ? draft.currency : existing.currency,
            booking_ref:
              draft.booking_ref !== undefined
                ? cleanStr(draft.booking_ref)
                : existing.booking_ref,
            status: draft.status !== undefined ? draft.status : existing.status,
            // When moved to a new day, sink to the end before renumbering.
            sort_order: moved ? Number.MAX_SAFE_INTEGER : existing.sort_order,
          };
          result = updated;
          let next = prev.map((e) => (e.id === id ? updated : e));
          next = renumberGroup(next, existing.trip_id, existing.date);
          if (moved) next = renumberGroup(next, existing.trip_id, date);
          return next;
        });
        if (!result) throw new Error(`Event ${id} not found`);
        return result;
      },

      deleteEvent: async (id) => {
        setEvents((prev) => {
          const existing = prev.find((e) => e.id === id);
          if (!existing) return prev;
          const next = prev.filter((e) => e.id !== id);
          return renumberGroup(next, existing.trip_id, existing.date);
        });
      },

      setDayOrder: async (tripId, date, orderedIds) => {
        const pos = new Map(orderedIds.map((id, i) => [id, i]));
        setEvents((prev) =>
          prev.map((e) =>
            inGroup(e, tripId, date) && pos.has(e.id)
              ? { ...e, sort_order: pos.get(e.id)! }
              : e,
          ),
        );
      },

      moveToDay: async (id, date) => {
        let result: ItineraryEvent | undefined;
        setEvents((prev) => {
          const existing = prev.find((e) => e.id === id);
          if (!existing) return prev;
          if (existing.date === date) {
            result = existing;
            return prev;
          }
          const moved: ItineraryEvent = {
            ...existing,
            date,
            sort_order: Number.MAX_SAFE_INTEGER,
          };
          result = moved;
          let next = prev.map((e) => (e.id === id ? moved : e));
          next = renumberGroup(next, existing.trip_id, existing.date);
          next = renumberGroup(next, existing.trip_id, date);
          return next;
        });
        if (!result) throw new Error(`Event ${id} not found`);
        return result;
      },
    };
  }, [events, ready]);

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. The Supabase-backed events provider (reads/writes + realtime,
// mapping `date` ↔ the days table) lands with the data sprint; until then the
// app runs on the preview backend. The context interface stays identical.
// ---------------------------------------------------------------------------
export function EventsProvider({ children }: { children: React.ReactNode }) {
  void isSupabaseConfigured;
  return <PreviewEventsProvider>{children}</PreviewEventsProvider>;
}
