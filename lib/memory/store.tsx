"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { compressImage } from "./compress";
import { idbAllPhotos, idbDeletePhoto, idbPutPhoto } from "./idb";
import { SAMPLE_DAY_MEMORIES } from "./sample";
import {
  byPhotoOrder,
  type DayMemory,
  type PhotoPatch,
  type PhotoRecord,
  type StoredPhoto,
} from "./types";

interface MemoryContextValue {
  /** False until the client store has hydrated (localStorage + IndexedDB). */
  ready: boolean;
  /** The note + rating for one day, or null if nothing's been written yet. */
  getDay: (tripId: string, date: string) => DayMemory | null;
  /** All non-empty day-memories for a trip (for the header summary). */
  getTripDays: (tripId: string) => DayMemory[];
  setDayNote: (tripId: string, date: string, note: string) => Promise<void>;
  setDayRating: (tripId: string, date: string, rating: number | null) => Promise<void>;
  /** One day's photos, in display order. */
  getPhotos: (tripId: string, date: string) => PhotoRecord[];
  /** Every photo on a trip (any day), in display order. */
  getTripPhotos: (tripId: string) => PhotoRecord[];
  /** Compress + store image files onto a day; returns how many were added. */
  addPhotos: (tripId: string, date: string, files: FileList | File[]) => Promise<number>;
  updatePhoto: (id: string, patch: PhotoPatch) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
}

const MemoryContext = React.createContext<MemoryContextValue | null>(null);

export function useMemory(): MemoryContextValue {
  const ctx = React.useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within <MemoryProvider>");
  return ctx;
}

/** A trip's day-memories + photos, memoized. */
export function useTripMemory(tripId: string): {
  days: DayMemory[];
  photos: PhotoRecord[];
  ready: boolean;
} {
  const ctx = useMemory();
  const days = React.useMemo(() => ctx.getTripDays(tripId), [ctx, tripId]);
  const photos = React.useMemo(() => ctx.getTripPhotos(tripId), [ctx, tripId]);
  return { days, photos, ready: ctx.ready };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAYS_KEY = "meridian.memory.days.v1";

function loadDays(): DayMemory[] | null {
  try {
    const raw = window.localStorage.getItem(DAYS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DayMemory[]) : null;
  } catch {
    return null;
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  return v.trim().length ? v : null;
}

function isEmptyDay(d: DayMemory): boolean {
  return cleanStr(d.note) === null && d.rating == null;
}

/** Insert/merge a day-memory; drops rows that end up fully empty. */
function upsertDay(
  prev: DayMemory[],
  tripId: string,
  date: string,
  patch: Partial<Pick<DayMemory, "note" | "rating">>,
): DayMemory[] {
  const now = new Date().toISOString();
  const idx = prev.findIndex((d) => d.trip_id === tripId && d.date === date);
  const base: DayMemory =
    idx === -1
      ? { trip_id: tripId, date, note: null, rating: null, updated_at: now }
      : prev[idx];
  const merged: DayMemory = { ...base, ...patch, updated_at: now };

  if (isEmptyDay(merged)) {
    return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
  }
  if (idx === -1) return [...prev, merged];
  const next = prev.slice();
  next[idx] = merged;
  return next;
}

function toRecord(p: StoredPhoto, url: string): PhotoRecord {
  const { blob: _blob, ...meta } = p;
  void _blob;
  return { ...meta, url };
}

// ---------------------------------------------------------------------------
// Preview backend — day notes/ratings in localStorage, photo binary in
// IndexedDB. Seeds the Amalfi sample memories. The Supabase-backed provider
// (Storage + signed URLs, realtime) lands later behind this same interface.
// ---------------------------------------------------------------------------
function PreviewMemoryProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = React.useState<DayMemory[]>(SAMPLE_DAY_MEMORIES);
  const [photos, setPhotos] = React.useState<PhotoRecord[]>([]);
  const [ready, setReady] = React.useState(false);

  // Stable refs so mutations can read current state + bytes without depending
  // on setState-updater timing, and so we can revoke object URLs on unmount.
  const photosRef = React.useRef<PhotoRecord[]>([]);
  const blobsRef = React.useRef<Map<string, Blob>>(new Map());
  const urlsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Hydrate once, post-mount (storage + IDB aren't readable during SSR).
  React.useEffect(() => {
    let cancelled = false;
    const storedDays = loadDays();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedDays) setDays(storedDays);

    (async () => {
      const stored = await idbAllPhotos();
      if (cancelled) return;
      const records = stored.sort(byPhotoOrder).map((p) => {
        const url = URL.createObjectURL(p.blob);
        urlsRef.current.add(url);
        blobsRef.current.set(p.id, p.blob);
        return toRecord(p, url);
      });
      if (cancelled) {
        for (const r of records) URL.revokeObjectURL(r.url);
        return;
      }
      setPhotos(records);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Revoke every object URL we minted when the provider goes away.
  React.useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  // Persist day-memories after hydration so we never clobber stored notes.
  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(DAYS_KEY, JSON.stringify(days));
    } catch {
      // best-effort
    }
  }, [days, ready]);

  const value = React.useMemo<MemoryContextValue>(() => {
    return {
      ready,

      getDay: (tripId, date) =>
        days.find((d) => d.trip_id === tripId && d.date === date) ?? null,

      getTripDays: (tripId) => days.filter((d) => d.trip_id === tripId),

      setDayNote: async (tripId, date, note) => {
        setDays((prev) => upsertDay(prev, tripId, date, { note: cleanStr(note) }));
      },

      setDayRating: async (tripId, date, rating) => {
        setDays((prev) => upsertDay(prev, tripId, date, { rating }));
      },

      getPhotos: (tripId, date) =>
        photos
          .filter((p) => p.trip_id === tripId && p.date === date)
          .sort(byPhotoOrder),

      getTripPhotos: (tripId) =>
        photos.filter((p) => p.trip_id === tripId).sort(byPhotoOrder),

      addPhotos: async (tripId, date, files) => {
        const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (list.length === 0) return 0;

        const group = photosRef.current.filter(
          (p) => p.trip_id === tripId && p.date === date,
        );
        let order = group.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1;

        const added: PhotoRecord[] = [];
        for (const file of list) {
          const c = await compressImage(file);
          const stored: StoredPhoto = {
            id: newId(),
            trip_id: tripId,
            date,
            caption: null,
            is_favorite: false,
            sort_order: order++,
            mime: c.mime,
            width: c.width,
            height: c.height,
            created_at: new Date().toISOString(),
            blob: c.blob,
          };
          await idbPutPhoto(stored);
          blobsRef.current.set(stored.id, c.blob);
          const url = URL.createObjectURL(c.blob);
          urlsRef.current.add(url);
          added.push(toRecord(stored, url));
        }
        setPhotos((prev) => [...prev, ...added]);
        return added.length;
      },

      updatePhoto: async (id, patch) => {
        const current = photosRef.current.find((p) => p.id === id);
        if (!current) return;
        const next: PhotoRecord = {
          ...current,
          caption:
            patch.caption !== undefined ? cleanStr(patch.caption) : current.caption,
          is_favorite:
            patch.is_favorite !== undefined ? patch.is_favorite : current.is_favorite,
        };
        setPhotos((prev) => prev.map((p) => (p.id === id ? next : p)));
        const blob = blobsRef.current.get(id);
        if (blob) {
          const { url: _url, ...meta } = next;
          void _url;
          await idbPutPhoto({ ...meta, blob });
        }
      },

      deletePhoto: async (id) => {
        const current = photosRef.current.find((p) => p.id === id);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        blobsRef.current.delete(id);
        if (current) {
          URL.revokeObjectURL(current.url);
          urlsRef.current.delete(current.url);
        }
        await idbDeletePhoto(id);
      },
    };
  }, [days, photos, ready]);

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. Mirrors EventsProvider: preview backend until Supabase keys
// arrive, identical context interface either way.
// ---------------------------------------------------------------------------
export function MemoryProvider({ children }: { children: React.ReactNode }) {
  void isSupabaseConfigured;
  return <PreviewMemoryProvider>{children}</PreviewMemoryProvider>;
}
