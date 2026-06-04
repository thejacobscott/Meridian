"use client";

import * as React from "react";
import { Reorder, motion, useDragControls } from "framer-motion";
import { CalendarOff, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { categoryById } from "@/lib/itinerary/categories";
import { useEvents, useTripEvents } from "@/lib/itinerary/store";
import {
  dayHeading,
  dayNumber,
  formatTimeRange,
  pickNowEvent,
  todayISO,
  tripDays,
  type ItineraryEvent,
} from "@/lib/itinerary/types";
import { effectiveStatus, type Trip } from "@/lib/trips/types";
import { DayStrip } from "./day-strip";
import { EventCard } from "./event-card";
import { EventForm } from "./event-form";

type Editing = ItineraryEvent | "new" | null;

/** The Itinerary sub-tab: a day strip over a per-day, reorderable event list. */
export function ItineraryTab({ trip }: { trip: Trip }) {
  const { events } = useTripEvents(trip.id);
  const { createEvent, updateEvent, deleteEvent, setDayOrder } = useEvents();

  const days = React.useMemo(
    () => tripDays(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date],
  );
  const today = todayISO();
  const todayInTrip = days.includes(today);
  const isActive = effectiveStatus(trip) === "active";

  const [selected, setSelected] = React.useState<string | null>(
    isActive && todayInTrip ? today : (days[0] ?? null),
  );
  const [editing, setEditing] = React.useState<Editing>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<ItineraryEvent | null>(
    null,
  );

  const dayEvents = React.useMemo(
    () => events.filter((e) => e.date === selected),
    [events, selected],
  );
  const ids = React.useMemo(() => dayEvents.map((e) => e.id), [dayEvents]);
  const byId = React.useMemo(
    () => new Map(dayEvents.map((e) => [e.id, e])),
    [dayEvents],
  );

  const dotsFor = React.useCallback(
    (key: string | null) =>
      events
        .filter((e) => e.date === key)
        .map((e) => categoryById(e.category_id)?.color ?? "var(--color-line)"),
    [events],
  );

  const now = React.useMemo(() => {
    if (!isActive || !todayInTrip) return null;
    return pickNowEvent(events.filter((e) => e.date === today));
  }, [events, isActive, todayInTrip, today]);

  const dayNo = selected ? dayNumber(selected, trip.start_date) : null;
  const addLabel = selected === null ? "your ideas" : "this day";

  function openNew() {
    setEditing("new");
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await deleteEvent(confirmDelete.id);
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-4">
      {days.length === 0 && (
        <p className="flex items-center gap-2 rounded-card border border-line bg-surface-2/60 px-3.5 py-2.5 text-sm text-ink-soft">
          <CalendarOff size={15} strokeWidth={1.75} className="shrink-0" />
          Add dates to this trip to open the day-by-day timeline. Until then, keep
          ideas here.
        </p>
      )}

      {now && (
        <button
          type="button"
          onClick={() => {
            setSelected(today);
            setEditing(now.event);
          }}
          className="flex w-full items-center gap-3 rounded-card border border-accent/30 bg-accent/[0.07] px-4 py-3 text-left transition-colors hover:bg-accent/10"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.65rem] font-medium uppercase tracking-[0.14em] text-accent-deep">
              {now.mode === "now" ? "Right now" : "Up next"}
            </span>
            <span className="block truncate font-medium text-ink">
              {now.event.title}
            </span>
            <span className="block truncate text-xs text-ink-soft">
              {[formatTimeRange(now.event.start_time, now.event.end_time), now.event.location_name]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft" />
        </button>
      )}

      <DayStrip
        days={days}
        selected={selected}
        onSelect={setSelected}
        dotsFor={dotsFor}
      />

      <section>
        <header className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-ink-soft">
              {selected === null ? "Unscheduled" : dayNo ? `Day ${dayNo}` : "Day"}
            </p>
            <h3 className="truncate text-xl leading-tight">
              {selected === null ? "Ideas" : dayHeading(selected)}
            </h3>
          </div>
          <span className="shrink-0 text-sm tabular-nums text-ink-soft">
            {dayEvents.length} {dayEvents.length === 1 ? "thing" : "things"}
          </span>
        </header>

        {dayEvents.length === 0 ? (
          <button
            type="button"
            onClick={openNew}
            className="flex w-full flex-col items-center gap-2 rounded-card border border-dashed border-line bg-surface/40 px-6 py-10 text-center transition-colors hover:border-accent/40 hover:bg-accent/[0.03]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
              <Plus size={20} strokeWidth={1.75} />
            </span>
            <span className="font-medium text-ink">Nothing here yet</span>
            <span className="max-w-xs text-sm text-ink-soft text-balance">
              {selected === null
                ? "Park the places you both want to go, then slot them into days."
                : "Tap to add the first thing to this day."}
            </span>
          </button>
        ) : (
          <>
            <Reorder.Group
              key={selected ?? "__ideas__"}
              axis="y"
              values={ids}
              onReorder={(next) =>
                setDayOrder(trip.id, selected, next as string[])
              }
              className="list-none space-y-2.5"
            >
              {ids.map((id) => {
                const event = byId.get(id);
                if (!event) return null;
                return (
                  <DayEventItem
                    key={id}
                    id={id}
                    event={event}
                    onEdit={() => setEditing(event)}
                  />
                );
              })}
            </Reorder.Group>

            <button
              type="button"
              onClick={openNew}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-line py-3 text-sm font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
            >
              <Plus size={16} strokeWidth={1.75} />
              Add to {addLabel}
            </button>
          </>
        )}
      </section>

      {/* Add / edit */}
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New event" : "Edit event"}
      >
        {editing !== null && (
          <EventForm
            event={editing === "new" ? undefined : editing}
            days={days}
            defaultDate={selected}
            tripCurrency={trip.currency}
            accent={trip.accent_color}
            onSubmit={(draft) =>
              editing === "new"
                ? createEvent(trip.id, draft)
                : updateEvent(editing.id, draft)
            }
            onDone={(saved) => {
              setEditing(null);
              setSelected(saved.date); // jump to the day it landed on
            }}
            onDelete={
              editing === "new"
                ? undefined
                : () => {
                    const target = editing;
                    setEditing(null);
                    setConfirmDelete(target);
                  }
            }
          />
        )}
      </Sheet>

      {/* Delete confirm */}
      <Sheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Remove this event?"
      >
        <p className="text-ink-soft text-balance">
          {confirmDelete?.title} will be taken off the plan. You can always add it
          again.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(null)}
            className="flex-1"
          >
            Keep it
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-clay px-5 text-[0.95rem] font-medium text-white shadow-soft transition active:scale-[0.97]"
          >
            Remove
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function DayEventItem({
  id,
  event,
  onEdit,
}: {
  id: string;
  event: ItineraryEvent;
  onEdit: () => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = React.useState(false);

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className="list-none"
    >
      <motion.div animate={{ scale: dragging ? 1.02 : 1 }} transition={{ duration: 0.15 }}>
        <EventCard
          event={event}
          onEdit={onEdit}
          dragControls={controls}
          dragging={dragging}
        />
      </motion.div>
    </Reorder.Item>
  );
}
