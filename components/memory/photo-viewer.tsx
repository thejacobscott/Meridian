"use client";

import * as React from "react";
import { Star, Trash2 } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { useMemory } from "@/lib/memory/store";
import type { PhotoRecord } from "@/lib/memory/types";

/**
 * Full view of one photo: edit its caption, star it as a favorite, or remove it.
 * Caption saves on close; remove is a two-tap guard so a memory isn't lost to a
 * stray click. Presentational shell over the memory store.
 */
export function PhotoViewer({
  photo,
  onClose,
}: {
  photo: PhotoRecord | null;
  onClose: () => void;
}) {
  const { updatePhoto, deletePhoto } = useMemory();
  const [caption, setCaption] = React.useState(photo?.caption ?? "");
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [lastId, setLastId] = React.useState<string | null>(photo?.id ?? null);

  // Reset local state when a different photo opens — adjusted during render.
  if ((photo?.id ?? null) !== lastId) {
    setLastId(photo?.id ?? null);
    setCaption(photo?.caption ?? "");
    setConfirmRemove(false);
  }

  function commitCaption() {
    if (!photo) return;
    const next = caption.trim();
    if ((photo.caption ?? "") !== next) {
      void updatePhoto(photo.id, { caption: next });
    }
  }

  function close() {
    commitCaption();
    onClose();
  }

  return (
    <Sheet open={photo !== null} onClose={close} title="Photo">
      {photo && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption ?? "Trip photo"}
              className="mx-auto max-h-[52vh] w-full object-contain"
            />
          </div>

          <Field label="Caption">
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={commitCaption}
              placeholder="A few words about this one…"
            />
          </Field>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => updatePhoto(photo.id, { is_favorite: !photo.is_favorite })}
              aria-pressed={photo.is_favorite}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                photo.is_favorite
                  ? "border-gold/40 bg-gold/10 text-ink"
                  : "border-line bg-surface/70 text-ink-soft hover:text-ink",
              )}
            >
              <Star
                size={16}
                strokeWidth={1.75}
                style={
                  photo.is_favorite
                    ? { color: "var(--color-gold)", fill: "var(--color-gold)" }
                    : undefined
                }
              />
              {photo.is_favorite ? "Favorite" : "Add to favorites"}
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!confirmRemove) {
                  setConfirmRemove(true);
                  return;
                }
                await deletePhoto(photo.id);
                onClose();
              }}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                confirmRemove
                  ? "bg-clay/10 text-clay"
                  : "text-ink-soft hover:bg-ink/[0.04] hover:text-clay",
              )}
            >
              <Trash2 size={16} strokeWidth={1.75} />
              {confirmRemove ? "Tap to confirm" : "Remove"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
