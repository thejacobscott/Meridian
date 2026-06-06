"use client";

import * as React from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { ACCENTS, DEFAULT_ACCENT, deepFor } from "@/lib/trips/accents";
import {
  STATUS_META,
  TRIP_STATUSES,
  deriveStatus,
  type Trip,
  type TripDraft,
  type TripStatus,
} from "@/lib/trips/types";
import { CoverCropper } from "./cover-cropper";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "MXN"];

type StatusMode = "auto" | TripStatus;

/**
 * Create / edit a trip. `onSubmit` is the store call; the form stays presentational
 * so it can live in the New-trip sheet (list) and the Edit sheet (detail) alike.
 */
export function TripForm({
  trip,
  onSubmit,
  onDone,
  onDelete,
}: {
  trip?: Trip;
  onSubmit: (draft: TripDraft) => Promise<Trip>;
  onDone: (trip: Trip) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = React.useState(trip?.title ?? "");
  const [destination, setDestination] = React.useState(trip?.destination ?? "");
  const [start, setStart] = React.useState(trip?.start_date ?? "");
  const [end, setEnd] = React.useState(trip?.end_date ?? "");
  const [currency, setCurrency] = React.useState(trip?.currency ?? "USD");
  const [budget, setBudget] = React.useState(
    trip?.budget != null ? String(trip.budget) : "",
  );
  const [accent, setAccent] = React.useState(
    trip?.accent_color ?? DEFAULT_ACCENT.color,
  );
  const [cover, setCover] = React.useState<string | null>(
    trip?.cover_photo_url ?? null,
  );
  const [statusMode, setStatusMode] = React.useState<StatusMode>(
    trip?.status_override ? trip.status : "auto",
  );
  const [saving, setSaving] = React.useState(false);

  const autoStatus = deriveStatus(start || null, end || null);
  const canSave = title.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const parsedBudget = budget.trim()
        ? Number.parseFloat(budget.replace(/[^0-9.]/g, ""))
        : NaN;
      const draft: TripDraft = {
        title: title.trim(),
        destination: destination.trim() || null,
        start_date: start || null,
        end_date: end || null,
        currency,
        budget: Number.isNaN(parsedBudget) || parsedBudget <= 0 ? null : parsedBudget,
        accent_color: accent,
        cover_photo_url: cover,
        status: statusMode === "auto" ? null : statusMode,
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
      className="space-y-6"
    >
      <CoverCropper value={cover} accent={accent} onChange={setCover} />

      <Field label="Trip name">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lisbon, slowly"
          autoFocus
          required
          className="text-[1.05rem]"
        />
      </Field>

      <Field label="Destination" hint="A city, a coastline, a whole country.">
        <Input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Lisbon, Portugal"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="End">
          <Input
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Accent" hint="Colors this trip everywhere it appears.">
        <div className="flex flex-wrap gap-2.5 pt-0.5">
          {ACCENTS.map((a) => {
            const selected = a.color === accent;
            return (
              <button
                key={a.color}
                type="button"
                onClick={() => setAccent(a.color)}
                aria-label={a.name}
                aria-pressed={selected}
                title={a.name}
                className={cn(
                  "relative h-8 w-8 rounded-full ring-1 ring-inset ring-ink/10 transition-transform",
                  selected ? "scale-110" : "hover:scale-105",
                )}
                style={{ backgroundColor: a.color }}
              >
                {selected && (
                  <Check
                    size={15}
                    strokeWidth={2.5}
                    className="absolute inset-0 m-auto text-white drop-shadow"
                  />
                )}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency" hint="Used across this trip.">
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-line bg-surface px-3.5 text-[0.95rem] text-ink shadow-press transition-colors focus:border-accent/60 focus-visible:outline-none"
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
          </div>
        </Field>
        <Field label="Budget" hint="Optional target.">
          <Input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            inputMode="decimal"
            placeholder="2,500"
            className="tabular-nums"
          />
        </Field>
      </div>

      <Field
        label="Status"
        hint={
          statusMode === "auto"
            ? "Follows the dates on its own."
            : "Pinned by hand — dates won't change it."
        }
      >
        <div className="flex flex-wrap gap-2 pt-0.5">
          <StatusChip
            active={statusMode === "auto"}
            onClick={() => setStatusMode("auto")}
          >
            Auto · {STATUS_META[autoStatus].label}
          </StatusChip>
          {TRIP_STATUSES.map((s) => (
            <StatusChip
              key={s}
              active={statusMode === s}
              onClick={() => setStatusMode(s)}
            >
              {STATUS_META[s].label}
            </StatusChip>
          ))}
        </div>
      </Field>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={!canSave} className="flex-1">
          {saving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : trip ? (
            "Save changes"
          ) : (
            "Create trip"
          )}
        </Button>
        {trip && onDelete && (
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
