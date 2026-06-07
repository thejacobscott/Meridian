"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import { ensureDay } from "@/lib/supabase/days";
import type { Database, Tables } from "@/lib/supabase/types";
import { useSpace } from "@/lib/space/store";
import { DEFAULT_CATEGORIES } from "./categories";
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
  /** Every event across every trip — powers the all-time Balance view. */
  getAllEvents: () => ItineraryEvent[];
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

      getAllEvents: () => [...events].sort(byDisplayOrder),

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
// Supabase backend. The view model's flat `date` maps onto the `days` table:
// each (trip, date) is a day row, and an event's `day_id` points at it (null =
// the Ideas bucket). Writes are optimistic; we ingest the *other* device's
// changes with a short debounced refetch, which resolves the day_id → date join
// fresh and sidesteps the ordering of day-row vs. event-row realtime arrivals.
// ---------------------------------------------------------------------------
type SupabaseClient = ReturnType<typeof getBrowserClient>;
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

/** Postgres `time` comes back as "HH:MM:SS"; the view model speaks "HH:MM". */
function normTime(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

// The rest of the app speaks category *slugs* (lib/itinerary/categories.ts);
// the DB seeds the same set with UUIDs. We reconcile the two at this seam only —
// matched by name, which is identical on both sides — so screens never see a
// UUID and balance.ts/event-form keep their readable slug ids. (Only the seeded
// defaults exist today; a custom category would map to null until it has a slug.)
interface CategoryMaps {
  slugByDbId: Map<string, string>;
  dbIdBySlug: Map<string, string>;
}

let categoryMapsPromise: Promise<CategoryMaps> | null = null;

function loadCategoryMaps(): Promise<CategoryMaps> {
  if (!categoryMapsPromise) {
    categoryMapsPromise = (async () => {
      const supabase = getBrowserClient();
      const { data } = await supabase.from("categories").select("id, name");
      const slugByName = new Map(DEFAULT_CATEGORIES.map((c) => [c.name, c.id]));
      const slugByDbId = new Map<string, string>();
      const dbIdBySlug = new Map<string, string>();
      for (const row of data ?? []) {
        const slug = slugByName.get(row.name);
        if (!slug) continue;
        slugByDbId.set(row.id, slug);
        dbIdBySlug.set(slug, row.id);
      }
      return { slugByDbId, dbIdBySlug };
    })();
  }
  return categoryMapsPromise;
}

function rowToEvent(
  r: Tables<"events">,
  dateById: Map<string, string>,
  slugByDbId: Map<string, string>,
): ItineraryEvent {
  return {
    id: r.id,
    trip_id: r.trip_id,
    date: r.day_id ? dateById.get(r.day_id) ?? null : null,
    title: r.title,
    category_id: r.category_id ? slugByDbId.get(r.category_id) ?? null : null,
    start_time: normTime(r.start_time),
    end_time: normTime(r.end_time),
    location_name: r.location_name,
    notes: r.notes,
    cost: r.cost,
    currency: r.currency,
    booking_ref: r.booking_ref,
    status: r.status,
    sort_order: r.sort_order,
    created_at: r.created_at,
  };
}

/** Load every event across the space's trips, with dates resolved from days. */
async function fetchAllEvents(spaceId: string): Promise<ItineraryEvent[]> {
  const supabase = getBrowserClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id")
    .eq("space_id", spaceId);
  const tripIds = (trips ?? []).map((t) => t.id);
  if (tripIds.length === 0) return [];
  const [{ data: days }, { data: events }, { slugByDbId }] = await Promise.all([
    supabase.from("days").select("id, date").in("trip_id", tripIds),
    supabase.from("events").select("*").in("trip_id", tripIds),
    loadCategoryMaps(),
  ]);
  const dateById = new Map((days ?? []).map((d) => [d.id, d.date]));
  return (events ?? []).map((e) => rowToEvent(e, dateById, slugByDbId));
}

/** Persist sort_order only for rows whose order actually changed. */
async function persistOrderDiff(
  supabase: SupabaseClient,
  prev: ItineraryEvent[],
  next: ItineraryEvent[],
): Promise<void> {
  const prevOrder = new Map(prev.map((e) => [e.id, e.sort_order]));
  const changed = next.filter((e) => prevOrder.get(e.id) !== e.sort_order);
  await Promise.all(
    changed.map((e) =>
      supabase.from("events").update({ sort_order: e.sort_order }).eq("id", e.id),
    ),
  );
}

function SupabaseEventsProvider({
  spaceId,
  userId,
  children,
}: {
  spaceId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [events, setEvents] = React.useState<ItineraryEvent[]>([]);
  const [ready, setReady] = React.useState(false);

  // Initial load + live channel. RLS scopes events/days to this space's trips,
  // so a broad subscription only carries our rows; a debounced refetch collapses
  // a burst of row writes (e.g. a drag reorder) into one authoritative reload.
  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fetchAllEvents(spaceId).then((evts) => {
          if (active) setEvents(evts);
        });
      }, 200);
    };

    void fetchAllEvents(spaceId).then((evts) => {
      if (!active) return;
      setEvents(evts);
      setReady(true);
    });

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`events:${spaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "days" },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [spaceId]);

  const value = React.useMemo<EventsContextValue>(() => {
    const supabase = getBrowserClient();
    return {
      ready,
      getEvents: (tripId) =>
        events.filter((e) => e.trip_id === tripId).sort(byDisplayOrder),

      getAllEvents: () => [...events].sort(byDisplayOrder),

      createEvent: async (tripId, draft) => {
        const date = draft.date ?? null;
        const [dayId, { dbIdBySlug }] = await Promise.all([
          ensureDay(supabase, tripId, date),
          loadCategoryMaps(),
        ]);
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
        // Slot into the day at its chronological position, then densify 0..n.
        const group = events
          .filter((e) => inGroup(e, tripId, date))
          .sort(byDisplayOrder);
        const idx = timeInsertionIndex(group, event.start_time);
        group.splice(idx, 0, event);
        const renumbered = group.map((e, i) => ({ ...e, sort_order: i }));
        const others = events.filter((e) => !inGroup(e, tripId, date));
        setEvents([...others, ...renumbered]);

        const mine = renumbered.find((e) => e.id === event.id)!;
        const { error } = await supabase.from("events").insert({
          id: event.id,
          trip_id: tripId,
          day_id: dayId,
          title: event.title,
          category_id: event.category_id
            ? dbIdBySlug.get(event.category_id) ?? null
            : null,
          start_time: event.start_time,
          end_time: event.end_time,
          location_name: event.location_name,
          notes: event.notes,
          cost: event.cost,
          currency: event.currency,
          booking_ref: event.booking_ref,
          status: event.status,
          sort_order: mine.sort_order,
          created_by: userId,
        });
        if (error) {
          setEvents(events);
          throw error;
        }
        await persistOrderDiff(
          supabase,
          events,
          renumbered.filter((e) => e.id !== event.id),
        );
        return mine;
      },

      updateEvent: async (id, draft) => {
        const existing = events.find((e) => e.id === id);
        if (!existing) throw new Error(`Event ${id} not found`);
        const date = draft.date !== undefined ? draft.date : existing.date;
        const moved = date !== existing.date;
        const [dayId, { dbIdBySlug }] = await Promise.all([
          moved ? ensureDay(supabase, existing.trip_id, date) : Promise.resolve(undefined),
          loadCategoryMaps(),
        ]);
        const updated: ItineraryEvent = {
          ...existing,
          date,
          title:
            draft.title !== undefined
              ? draft.title.trim() || existing.title
              : existing.title,
          category_id:
            draft.category_id !== undefined ? draft.category_id : existing.category_id,
          start_time:
            draft.start_time !== undefined ? draft.start_time : existing.start_time,
          end_time: draft.end_time !== undefined ? draft.end_time : existing.end_time,
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
          sort_order: moved ? Number.MAX_SAFE_INTEGER : existing.sort_order,
        };
        let next = events.map((e) => (e.id === id ? updated : e));
        next = renumberGroup(next, existing.trip_id, existing.date);
        if (moved) next = renumberGroup(next, existing.trip_id, date);
        setEvents(next);

        const finalRow = next.find((e) => e.id === id)!;
        const upd: EventUpdate = {
          title: updated.title,
          category_id: updated.category_id
            ? dbIdBySlug.get(updated.category_id) ?? null
            : null,
          start_time: updated.start_time,
          end_time: updated.end_time,
          location_name: updated.location_name,
          notes: updated.notes,
          cost: updated.cost,
          currency: updated.currency,
          booking_ref: updated.booking_ref,
          status: updated.status,
          sort_order: finalRow.sort_order,
        };
        if (moved) upd.day_id = dayId ?? null;
        const { error } = await supabase.from("events").update(upd).eq("id", id);
        if (error) {
          setEvents(events);
          throw error;
        }
        await persistOrderDiff(
          supabase,
          events,
          next.filter((e) => e.id !== id),
        );
        return finalRow;
      },

      deleteEvent: async (id) => {
        const existing = events.find((e) => e.id === id);
        if (!existing) return;
        const next = renumberGroup(
          events.filter((e) => e.id !== id),
          existing.trip_id,
          existing.date,
        );
        setEvents(next);
        const { error } = await supabase.from("events").delete().eq("id", id);
        if (error) {
          setEvents(events);
          throw error;
        }
        await persistOrderDiff(supabase, events, next);
      },

      setDayOrder: async (tripId, date, orderedIds) => {
        const pos = new Map(orderedIds.map((id, i) => [id, i]));
        const next = events.map((e) =>
          inGroup(e, tripId, date) && pos.has(e.id)
            ? { ...e, sort_order: pos.get(e.id)! }
            : e,
        );
        setEvents(next);
        try {
          await persistOrderDiff(supabase, events, next);
        } catch (err) {
          setEvents(events);
          throw err;
        }
      },

      moveToDay: async (id, date) => {
        const existing = events.find((e) => e.id === id);
        if (!existing) throw new Error(`Event ${id} not found`);
        if (existing.date === date) return existing;
        const dayId = await ensureDay(supabase, existing.trip_id, date);
        const moved: ItineraryEvent = {
          ...existing,
          date,
          sort_order: Number.MAX_SAFE_INTEGER,
        };
        let next = events.map((e) => (e.id === id ? moved : e));
        next = renumberGroup(next, existing.trip_id, existing.date);
        next = renumberGroup(next, existing.trip_id, date);
        setEvents(next);

        const finalRow = next.find((e) => e.id === id)!;
        const { error } = await supabase
          .from("events")
          .update({ day_id: dayId ?? null, sort_order: finalRow.sort_order })
          .eq("id", id);
        if (error) {
          setEvents(events);
          throw error;
        }
        await persistOrderDiff(
          supabase,
          events,
          next.filter((e) => e.id !== id),
        );
        return finalRow;
      },
    };
  }, [events, ready, userId]);

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. Real backend when Supabase is configured and the space is
// resolved; otherwise the preview backend. The context interface is identical.
// ---------------------------------------------------------------------------
export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, userId } = useSpace();
  if (isSupabaseConfigured && spaceId && userId) {
    return (
      <SupabaseEventsProvider spaceId={spaceId} userId={userId}>
        {children}
      </SupabaseEventsProvider>
    );
  }
  return <PreviewEventsProvider>{children}</PreviewEventsProvider>;
}
