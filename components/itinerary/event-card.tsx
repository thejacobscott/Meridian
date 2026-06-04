"use client";

import type { DragControls } from "framer-motion";
import { Banknote, Check, GripVertical, MapPin, Ticket } from "lucide-react";
import { cn } from "@/lib/cn";
import { categoryById } from "@/lib/itinerary/categories";
import {
  EVENT_STATUS_META,
  formatMoney,
  formatTime,
  type EventStatus,
  type ItineraryEvent,
} from "@/lib/itinerary/types";
import { CategoryChip } from "./category-chip";

/**
 * One event in the day's timeline: a time rail, a category-colored spine, the
 * title with a status bullet, and a meta row (place / cost / booking). Tap the
 * body to edit; drag the handle to reorder.
 */
export function EventCard({
  event,
  onEdit,
  dragControls,
  dragging,
}: {
  event: ItineraryEvent;
  onEdit: () => void;
  dragControls?: DragControls;
  dragging?: boolean;
}) {
  const category = categoryById(event.category_id);
  const done = event.status === "done";
  const spine = category?.color ?? "var(--color-line)";

  return (
    <div
      className={cn(
        "flex items-stretch gap-2.5 rounded-card border border-line bg-surface p-3 shadow-soft transition-shadow",
        dragging && "shadow-lift",
        done && "opacity-65",
      )}
    >
      {/* Time rail */}
      <div className="w-16 shrink-0 pt-0.5 text-right">
        {event.start_time ? (
          <>
            <div className="text-sm font-medium tabular-nums leading-tight">
              {formatTime(event.start_time)}
            </div>
            {event.end_time && (
              <div className="text-[0.7rem] tabular-nums text-ink-soft">
                {formatTime(event.end_time)}
              </div>
            )}
          </>
        ) : (
          <div className="text-[0.65rem] uppercase tracking-[0.12em] text-ink-faint">
            Anytime
          </div>
        )}
      </div>

      {/* Category spine */}
      <span
        aria-hidden
        className="w-1 shrink-0 rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${spine} 55%, transparent)` }}
      />

      {/* Body — tap to edit */}
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-start gap-2">
          <StatusBullet status={event.status} />
          <h4
            className={cn(
              "min-w-0 flex-1 text-[0.95rem] font-medium leading-snug text-ink",
              done && "line-through decoration-ink-faint",
            )}
          >
            {event.title}
          </h4>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[1.375rem] text-[0.78rem] text-ink-soft">
          {category && <CategoryChip category={category} />}
          {event.location_name && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin size={12} strokeWidth={1.75} className="shrink-0" />
              <span className="truncate">{event.location_name}</span>
            </span>
          )}
          {event.cost != null && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Banknote size={12} strokeWidth={1.75} className="shrink-0" />
              {formatMoney(event.cost, event.currency)}
            </span>
          )}
          {event.booking_ref && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Ticket size={12} strokeWidth={1.75} className="shrink-0" />
              <span className="truncate">{event.booking_ref}</span>
            </span>
          )}
        </div>
      </button>

      {/* Drag handle */}
      {dragControls && (
        <button
          type="button"
          aria-label="Reorder"
          onPointerDown={(e) => dragControls.start(e)}
          className="shrink-0 touch-none cursor-grab self-center rounded-md p-1 text-ink-faint transition-colors hover:text-ink-soft active:cursor-grabbing"
        >
          <GripVertical size={16} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

function StatusBullet({ status }: { status: EventStatus }) {
  const label = EVENT_STATUS_META[status].label;
  if (status === "done") {
    return (
      <span
        className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink-soft"
        title={label}
      >
        <Check size={11} strokeWidth={2.5} />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  const tone =
    status === "planned"
      ? "bg-accent"
      : status === "booked"
        ? "bg-sage"
        : "border border-ink-faint bg-transparent"; // idea
  return (
    <span
      className={cn("mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full", tone)}
      title={label}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
