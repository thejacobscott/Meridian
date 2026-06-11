"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import type { WishlistDraft, WishlistItem, WishlistKind } from "@/lib/wishlist/types";

/** Per-kind copy so the same form reads right for a place or a date idea. */
const COPY: Record<
  WishlistKind,
  {
    titleLabel: string;
    titleHint: string;
    titlePlaceholder: string;
    placeLabel: string;
    placeHint: string;
    placePlaceholder: string;
    notePlaceholder: string;
  }
> = {
  place: {
    titleLabel: "The dream",
    titleHint: "A place, a hotel, a tiny restaurant — anything.",
    titlePlaceholder: "Cherry blossoms in Kyoto",
    placeLabel: "Where",
    placeHint: "A city, a region, or a season to aim for.",
    placePlaceholder: "Japan · early April",
    notePlaceholder: "Why it's on the list…",
  },
  date: {
    titleLabel: "The date idea",
    titleHint: "Something to do together — big or small.",
    titlePlaceholder: "Cook the pasta from scratch",
    placeLabel: "Where",
    placeHint: "A spot, if it has one.",
    placePlaceholder: "the studio on 4th · optional",
    notePlaceholder: "Why you want to try it…",
  },
};

/**
 * Add / edit a someday. Presentational like TripForm — `onSubmit` is the store
 * call, so the same form serves the "add" sheet and the per-item "edit" sheet.
 * A kind toggle picks the section it lands in (a place to go, or a date idea);
 * the labels follow. Mount it with a `key` (item id or "new") so the field
 * initializers re-run when the target changes. Remove is a two-tap inline
 * confirm — no separate sheet.
 */
export function WishlistItemForm({
  item,
  defaultKind = "place",
  onSubmit,
  onDone,
  onDelete,
}: {
  item?: WishlistItem;
  defaultKind?: WishlistKind;
  onSubmit: (draft: WishlistDraft) => Promise<void>;
  onDone: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  const [kind, setKind] = React.useState<WishlistKind>(item?.kind ?? defaultKind);
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [place, setPlace] = React.useState(item?.place ?? "");
  const [note, setNote] = React.useState(item?.note ?? "");
  const [saving, setSaving] = React.useState(false);
  const [armed, setArmed] = React.useState(false);

  const copy = COPY[kind];
  const canSave = title.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        kind,
        title: title.trim(),
        place: place.trim() || null,
        note: note.trim() || null,
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SegmentedControl
        className="w-full"
        items={[
          { value: "place", label: "A place" },
          { value: "date", label: "A date idea" },
        ]}
        value={kind}
        onChange={(v) => setKind(v as WishlistKind)}
      />

      <Field label={copy.titleLabel} hint={copy.titleHint}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={copy.titlePlaceholder}
          autoFocus
          required
          className="text-[1.05rem]"
        />
      </Field>

      <Field label={copy.placeLabel} hint={copy.placeHint}>
        <Input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder={copy.placePlaceholder}
        />
      </Field>

      <Field label="Note">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={copy.notePlaceholder}
        />
      </Field>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={!canSave} className="flex-1">
          {saving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : item ? (
            "Save changes"
          ) : (
            "Add to the list"
          )}
        </Button>
        {item && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              void onDelete();
            }}
            onBlur={() => setArmed(false)}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
              armed
                ? "bg-clay/10 text-clay"
                : "text-ink-soft hover:bg-ink/[0.04] hover:text-clay",
            )}
          >
            <Trash2 size={16} strokeWidth={1.75} />
            {armed ? "Tap again" : "Remove"}
          </button>
        )}
      </div>
    </form>
  );
}
