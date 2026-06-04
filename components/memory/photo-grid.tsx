"use client";

import * as React from "react";
import { ImagePlus, Loader2, Star } from "lucide-react";
import { useMemory } from "@/lib/memory/store";
import type { PhotoRecord } from "@/lib/memory/types";
import { PhotoViewer } from "./photo-viewer";

/**
 * A day's photos as matted "prints" (the .photo-print frame), with multi-upload.
 * Files are compressed client-side in the store before they're kept; while that
 * runs the add control shows a spinner. Tapping a print opens the viewer.
 */
export function PhotoGrid({
  tripId,
  date,
  photos,
}: {
  tripId: string;
  date: string;
  photos: PhotoRecord[];
}) {
  const { addPhotos } = useMemory();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  // Track by id (not the object) so the viewer reflects live edits and closes
  // itself when the photo is removed.
  const [viewingId, setViewingId] = React.useState<string | null>(null);
  const viewing = viewingId
    ? photos.find((p) => p.id === viewingId) ?? null
    : null;

  function pick() {
    inputRef.current?.click();
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await addPhotos(tripId, date, files);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface/40 px-4 py-6 text-sm font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Adding photos…
            </>
          ) : (
            <>
              <ImagePlus size={16} strokeWidth={1.75} />
              Add photos
            </>
          )}
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setViewingId(p.id)}
              className="photo-print group relative block aspect-square overflow-hidden rounded-[6px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? "Trip photo"}
                loading="lazy"
                className="h-full w-full rounded-[3px] object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              {p.is_favorite && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface/90 shadow-soft">
                  <Star
                    size={11}
                    strokeWidth={2}
                    style={{ color: "var(--color-gold)", fill: "var(--color-gold)" }}
                  />
                </span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-line bg-surface/40 text-ink-soft transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ImagePlus size={18} strokeWidth={1.75} />
            )}
            <span className="text-xs font-medium">{uploading ? "Adding…" : "Add"}</span>
          </button>
        </div>
      )}

      <PhotoViewer photo={viewing} onClose={() => setViewingId(null)} />
    </>
  );
}
