"use client";

import * as React from "react";
import { useMemory } from "@/lib/memory/store";
import type { DayMemory, PhotoRecord } from "@/lib/memory/types";
import { dayHeading, dayNumber } from "@/lib/itinerary/types";
import { PhotoGrid } from "./photo-grid";
import { RatingStars } from "./rating-stars";

/**
 * One day in the scrapbook: a dated heading + star rating, a free-write note,
 * and the day's photos. Note and rating autosave to the memory store.
 */
export function DayEntry({
  tripId,
  startDate,
  date,
  day,
  photos,
}: {
  tripId: string;
  startDate: string | null;
  date: string;
  day: DayMemory | null;
  photos: PhotoRecord[];
}) {
  const { setDayNote, setDayRating } = useMemory();
  const n = dayNumber(date, startDate);

  return (
    <section className="space-y-3.5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[1.3rem] leading-tight">{dayHeading(date)}</h3>
          {n != null && <p className="eyebrow mt-1">Day {n}</p>}
        </div>
        <RatingStars
          value={day?.rating ?? null}
          onChange={(v) => setDayRating(tripId, date, v)}
          size={19}
          className="shrink-0 pt-0.5"
        />
      </header>

      <NoteEditor
        value={day?.note ?? ""}
        onSave={(text) => setDayNote(tripId, date, text)}
      />

      <PhotoGrid tripId={tripId} date={date} photos={photos} />
    </section>
  );
}

/**
 * A calm, paper-like free-write field that grows with its content and saves on
 * blur. Deliberately unboxed — it reads like writing on the page, not a form.
 */
function NoteEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (text: string) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [text, setText] = React.useState(value);
  const [lastValue, setLastValue] = React.useState(value);

  // Adopt the stored value if it changes from elsewhere (e.g. a future sync),
  // adjusting during render rather than in an effect.
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  const grow = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    grow();
  }, [grow, text]);

  return (
    <textarea
      ref={ref}
      value={text}
      rows={1}
      onChange={(e) => setText(e.target.value)}
      onInput={grow}
      onBlur={() => {
        if (value !== text) onSave(text);
      }}
      placeholder="Write something to remember about this day…"
      className="w-full resize-none bg-transparent text-[0.98rem] leading-relaxed text-ink placeholder:text-ink-soft/50 focus-visible:outline-none"
    />
  );
}
