"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { DEFAULT_CATEGORIES } from "@/lib/itinerary/categories";
import { deepFor } from "@/lib/trips/accents";
import {
  EVENT_STATUSES,
  EVENT_STATUS_META,
  dayParts,
  type EventDraft,
  type EventStatus,
  type ItineraryEvent,
} from "@/lib/itinerary/types";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "MXN"];

/**
 * Create / edit an event. Presentational like TripForm: `onSubmit` is the store
 * call, so the same form serves the "add to this day" and "edit" sheets. The day
 * picker is how an event is rescheduled between days from inside the form.
 */
export function EventForm({
  event,
  days,
  defaultDate,
  defaultCategoryId = null,
  tripCurrency,
  accent,
  onSubmit,
  onDone,
  onDelete,
}: {
  event?: ItineraryEvent;
  days: string[];
  defaultDate: string | null;
  /** Preselect a category when creating (used by the Balance nudge). */
  defaultCategoryId?: string | null;
  tripCurrency: string;
  accent: string;
  onSubmit: (draft: EventDraft) => Promise<ItineraryEvent>;
  onDone: (event: ItineraryEvent) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [date, setDate] = React.useState<string | null>(
    event ? event.date : defaultDate,
  );
  const [categoryId, setCategoryId] = React.useState<string | null>(
    event?.category_id ?? defaultCategoryId,
  );
  const [start, setStart] = React.useState(event?.start_time ?? "");
  const [end, setEnd] = React.useState(event?.end_time ?? "");
  const [location, setLocation] = React.useState(event?.location_name ?? "");
  const [cost, setCost] = React.useState(
    event?.cost != null ? String(event.cost) : "",
  );
  const [currency, setCurrency] = React.useState(
    event?.currency ?? tripCurrency ?? "USD",
  );
  const [booking, setBooking] = React.useState(event?.booking_ref ?? "");
  const [notes, setNotes] = React.useState(event?.notes ?? "");
  const [status, setStatus] = React.useState<EventStatus>(event?.status ?? "idea");
  const [saving, setSaving] = React.useState(false);
  // Quick-add by default: just a title (and maybe a time). Editing opens with
  // everything visible, since you're there to change the details.
  const [expanded, setExpanded] = React.useState(Boolean(event));

  const canSave = title.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const parsedCost = cost.trim() === "" ? null : Number.parseFloat(cost);
      const draft: EventDraft = {
        title: title.trim(),
        date,
        category_id: categoryId,
        start_time: start || null,
        end_time: end || null,
        location_name: location.trim() || null,
        cost: parsedCost != null && Number.isFinite(parsedCost) ? parsedCost : null,
        currency,
        booking_ref: booking.trim() || null,
        notes: notes.trim() || null,
        status,
      };
      const saved = await onSubmit(draft);
      onDone(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={
        {
          "--accent": accent,
          "--accent-deep": deepFor(accent),
        } as React.CSSProperties
      }
      className="space-y-5"
    >
      <Field label="What are you planning?">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dinner at the Time Out Market"
          autoFocus
          required
          className="text-[1.05rem]"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="End">
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
        >
          <ChevronDown size={15} strokeWidth={1.75} />
          More details
        </button>
      )}

      {expanded && (
        <>
          <Field label="Category">
            <div className="flex flex-wrap gap-2 pt-0.5">
              <CategoryButton
                selected={categoryId === null}
                onClick={() => setCategoryId(null)}
              >
                None
              </CategoryButton>
              {DEFAULT_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const selected = categoryId === c.id;
                return (
                  <CategoryButton
                    key={c.id}
                    color={c.color}
                    selected={selected}
                    onClick={() => setCategoryId(c.id)}
                  >
                    <Icon size={13} strokeWidth={2} />
                    {c.name}
                  </CategoryButton>
                );
              })}
            </div>
          </Field>

          <Field label="Day" hint="Move it between days, or park it in Ideas.">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pt-0.5">
              <DayButton
                selected={date === null}
                onClick={() => setDate(null)}
              >
                <Sparkles size={13} strokeWidth={1.75} />
                Ideas
              </DayButton>
              {days.map((d) => {
                const parts = dayParts(d);
                return (
                  <DayButton key={d} selected={date === d} onClick={() => setDate(d)}>
                    <span className="text-[0.65rem] uppercase tracking-wide opacity-70">
                      {parts.weekday}
                    </span>
                    {parts.day}
                  </DayButton>
                );
              })}
            </div>
          </Field>

          <Field label="Place">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Mercado da Ribeira"
            />
          </Field>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Cost">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Currency">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-11 appearance-none rounded-lg border border-line bg-surface px-3.5 text-[0.95rem] text-ink shadow-press transition-colors focus:border-accent/60 focus-visible:outline-none"
              >
                {(CURRENCIES.includes(currency)
                  ? CURRENCIES
                  : [currency, ...CURRENCIES]
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Booking reference" hint="Confirmation number, table, ticket…">
            <Input
              value={booking}
              onChange={(e) => setBooking(e.target.value)}
              placeholder="Table for 2"
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you want to remember."
            />
          </Field>

          <Field label="Status">
            <div className="flex flex-wrap gap-2 pt-0.5">
              {EVENT_STATUSES.map((s) => (
                <StatusChip
                  key={s}
                  active={status === s}
                  onClick={() => setStatus(s)}
                >
                  {EVENT_STATUS_META[s].label}
                </StatusChip>
              ))}
            </div>
          </Field>
        </>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={!canSave} className="flex-1">
          {saving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : event ? (
            "Save changes"
          ) : (
            "Add to the plan"
          )}
        </Button>
        {event && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-clay"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function CategoryButton({
  color,
  selected,
  onClick,
  children,
}: {
  color?: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "text-ink"
          : "border-line bg-surface/60 text-ink-soft hover:text-ink",
      )}
      style={
        selected
          ? {
              borderColor: `color-mix(in oklab, ${color ?? "var(--color-ink)"} 45%, transparent)`,
              backgroundColor: `color-mix(in oklab, ${color ?? "var(--color-ink)"} 14%, transparent)`,
            }
          : undefined
      }
    >
      {children}
      {selected && <Check size={13} strokeWidth={2.5} className="opacity-70" />}
    </button>
  );
}

function DayButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-12 shrink-0 flex-col items-center justify-center gap-0 rounded-xl border px-3 text-sm font-medium leading-none transition-colors",
        selected
          ? "border-accent/40 bg-accent/12 text-accent-deep"
          : "border-line bg-surface/60 text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function StatusChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-accent/40 bg-accent/12 text-accent-deep"
          : "border-line bg-surface/60 text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
