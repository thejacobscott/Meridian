"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookHeart, Printer } from "lucide-react";
import { RatingStars } from "@/components/memory/rating-stars";
import { coverGradient } from "@/components/trips/cover-image";
import { deepFor } from "@/lib/trips/accents";
import {
  byPhotoOrder,
  summarizeTripMemory,
  type PhotoRecord,
} from "@/lib/memory/types";
import { useTripMemory } from "@/lib/memory/store";
import { useTrips } from "@/lib/trips/store";
import { dayHeading, dayNumber, tripDays } from "@/lib/itinerary/types";
import { formatDateRange, tripNights } from "@/lib/trips/types";

interface BookEntry {
  date: string;
  note: string | null;
  rating: number | null;
  photos: PhotoRecord[];
}

/**
 * The photo-book / PDF export. A print-tuned, editorial render of a trip's
 * scrapbook — a cover, then one spread per remembered day (note, rating,
 * photos). The browser's own "Save as PDF" turns it into a keepsake; print
 * styles (globals.css) drop the app chrome and render colors true. Keyless, no
 * server: it reads the same memory store the scrapbook tab does.
 */
export function TripBook({ id }: { id: string }) {
  const { getTrip, ready: tripsReady } = useTrips();
  const { days, photos, ready: memReady } = useTripMemory(id);
  const trip = getTrip(id);

  const entries = React.useMemo<BookEntry[]>(() => {
    if (!trip) return [];
    const dayMap = new Map(days.map((d) => [d.date, d]));
    const photoMap = new Map<string, PhotoRecord[]>();
    for (const p of photos) {
      if (!p.date) continue;
      const arr = photoMap.get(p.date);
      if (arr) arr.push(p);
      else photoMap.set(p.date, [p]);
    }
    // Trip days first, plus any dated content that lands outside the range.
    const dates = new Set<string>(tripDays(trip.start_date, trip.end_date));
    for (const d of days) dates.add(d.date);
    for (const p of photos) if (p.date) dates.add(p.date);

    return [...dates]
      .sort((a, b) => a.localeCompare(b))
      .map((date) => {
        const dm = dayMap.get(date) ?? null;
        return {
          date,
          note: dm?.note ?? null,
          rating: dm?.rating ?? null,
          photos: (photoMap.get(date) ?? []).slice().sort(byPhotoOrder),
        };
      })
      .filter(
        (e) =>
          (!!e.note && e.note.trim().length > 0) ||
          e.rating != null ||
          e.photos.length > 0,
      );
  }, [trip, days, photos]);

  if (!tripsReady || !memReady) {
    return (
      <BookShell>
        <p className="py-20 text-center text-ink-soft">Gathering your memories…</p>
      </BookShell>
    );
  }

  if (!trip) {
    return (
      <BookShell>
        <div className="py-20 text-center">
          <h1 className="text-2xl">This trip wandered off</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft text-balance">
            We couldn&apos;t find it to make its book.
          </p>
          <BackLink href="/trips" label="Back to all trips" className="mt-6" />
        </div>
      </BookShell>
    );
  }

  const summary = summarizeTripMemory(days, photos);
  const accent = trip.accent_color;
  const nights = tripNights(trip.start_date, trip.end_date);

  const summaryBits: string[] = [];
  if (summary.photoCount > 0)
    summaryBits.push(
      `${summary.photoCount} ${summary.photoCount === 1 ? "photo" : "photos"}`,
    );
  if (summary.daysWithContent > 0)
    summaryBits.push(
      `${summary.daysWithContent} ${summary.daysWithContent === 1 ? "day" : "days"} remembered`,
    );

  return (
    <BookShell accent={accent} tripId={trip.id} printable={entries.length > 0}>
      {entries.length === 0 ? (
        <div className="py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
            <BookHeart size={22} strokeWidth={1.5} />
          </span>
          <h2 className="mt-4 text-xl">Nothing to bind just yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft text-balance">
            Add a few photos or a line or two to this trip&apos;s days, and they
            gather here into a book you can save and print.
          </p>
          <BackLink
            href={`/trips/${trip.id}`}
            label="Back to the trip"
            className="mt-6"
          />
        </div>
      ) : (
        <article className="space-y-12">
          {/* Cover */}
          <section className="book-page book-keep">
            <div
              className="overflow-hidden rounded-xl"
              style={{ background: coverGradient(accent) }}
            >
              <div className="flex min-h-[42vh] flex-col justify-end p-8 sm:p-10">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-paper/85">
                  A Meridian book
                </p>
                <h1 className="mt-2 text-[2.6rem] leading-[1.04] tracking-[-0.02em] text-paper drop-shadow-sm sm:text-[3.2rem]">
                  {trip.title}
                </h1>
                {trip.destination && (
                  <p className="mt-2 text-paper/90">{trip.destination}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm tabular-nums text-ink-soft">
                {formatDateRange(trip.start_date, trip.end_date)}
                {nights > 0 && ` · ${nights} ${nights === 1 ? "night" : "nights"}`}
              </p>
              {summaryBits.length > 0 && (
                <p className="text-sm text-ink-soft">{summaryBits.join(" · ")}</p>
              )}
            </div>
          </section>

          {/* One spread per remembered day */}
          {entries.map((entry) => (
            <DaySpread
              key={entry.date}
              entry={entry}
              startDate={trip.start_date}
            />
          ))}

          {/* Colophon */}
          <p className="book-keep border-t border-line pt-6 text-center text-xs text-ink-soft/70">
            Made with Meridian — for the two of you.
          </p>
        </article>
      )}
    </BookShell>
  );
}

function DaySpread({
  entry,
  startDate,
}: {
  entry: BookEntry;
  startDate: string | null;
}) {
  const n = dayNumber(entry.date, startDate);
  return (
    <section className="book-keep space-y-4">
      <header className="space-y-1.5">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-ink-soft">
          {n ? `Day ${n}` : "A day"}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 className="text-2xl leading-tight">{dayHeading(entry.date)}</h2>
          {entry.rating != null && <RatingStars value={entry.rating} size={16} />}
        </div>
      </header>

      {entry.note && (
        <p
          className="text-[1.05rem] leading-relaxed text-ink text-pretty"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
        >
          {entry.note}
        </p>
      )}

      {entry.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {entry.photos.map((p) => (
            <figure key={p.id} className="book-keep photo-print rounded-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? ""}
                className="block w-full rounded-[2px] object-cover"
                style={{ aspectRatio: `${p.width} / ${p.height}` }}
              />
              {p.caption && (
                <figcaption className="px-1 pt-2 pb-0.5 text-xs text-ink-soft text-balance">
                  {p.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

/** The page frame: a no-print toolbar over the book body. */
function BookShell({
  children,
  accent,
  tripId,
  printable = false,
}: {
  children: React.ReactNode;
  accent?: string;
  tripId?: string;
  printable?: boolean;
}) {
  return (
    <div
      style={
        accent
          ? ({
              "--accent": accent,
              "--accent-deep": deepFor(accent),
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="no-print mb-8 flex items-center justify-between gap-3">
        <BackLink href={tripId ? `/trips/${tripId}` : "/trips"} label="Back" />
        {printable && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper shadow-soft transition active:scale-[0.97]"
          >
            <Printer size={15} strokeWidth={1.75} />
            Save as PDF
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink ${className ?? ""}`}
    >
      <ArrowLeft size={16} strokeWidth={1.75} />
      {label}
    </Link>
  );
}
