"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { WishlistDraft, WishlistItem } from "@/lib/wishlist/types";

/**
 * Add / edit a someday. Presentational like TripForm — `onSubmit` is the store
 * call, so the same form serves the "add" sheet and the per-item "edit" sheet.
 * Mount it with a `key` (item id or "new") so the field initializers re-run when
 * the target changes. Remove is a two-tap inline confirm — no separate sheet.
 */
export function WishlistItemForm({
  item,
  onSubmit,
  onDone,
  onDelete,
}: {
  item?: WishlistItem;
  onSubmit: (draft: WishlistDraft) => Promise<void>;
  onDone: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [place, setPlace] = React.useState(item?.place ?? "");
  const [note, setNote] = React.useState(item?.note ?? "");
  const [saving, setSaving] = React.useState(false);
  const [armed, setArmed] = React.useState(false);

  const canSave = title.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
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
      <Field label="The dream" hint="A place, a hotel, a tiny restaurant — anything.">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Cherry blossoms in Kyoto"
          autoFocus
          required
          className="text-[1.05rem]"
        />
      </Field>

      <Field label="Where" hint="A city, a region, or a season to aim for.">
        <Input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Japan · early April"
        />
      </Field>

      <Field label="Note">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why it's on the list…"
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
