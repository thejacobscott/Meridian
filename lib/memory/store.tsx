"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import { ensureDay } from "@/lib/supabase/days";
import type { Tables } from "@/lib/supabase/types";
import { useSpace } from "@/lib/space/store";
import { previewKey } from "@/lib/preview/hubs";
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
    const raw = window.localStorage.getItem(previewKey(DAYS_KEY));
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
      window.localStorage.setItem(previewKey(DAYS_KEY), JSON.stringify(days));
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
// Supabase backend — day notes/ratings in `days`, photo binary in the private
// `trip-photos` Storage bucket, metadata in `photos`. Realtime carries the
// other side's edits; RLS scopes both tables to this space's trips, so the
// broad subscription only ever delivers our rows. Day notes share the `days`
// table with the itinerary, so we never delete an emptied day row (it may still
// anchor events) — empties are filtered on read instead.
// ---------------------------------------------------------------------------
type SupabaseClient = ReturnType<typeof getBrowserClient>;

const BUCKET = "trip-photos";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // one week

function rowToDayMemory(r: Tables<"days">): DayMemory {
  return {
    trip_id: r.trip_id,
    date: r.date,
    note: r.summary_note,
    rating: r.rating,
    updated_at: r.updated_at,
  };
}

// `photos` carries no mime column — display reads `url`, never `.mime` — so the
// view-model field is a harmless constant. width/height back the book's reserved
// aspect ratios (migration 0005); day_id resolves to a date via the days join.
function rowToPhoto(
  r: Tables<"photos">,
  dateById: Map<string, string>,
  url: string,
): PhotoRecord {
  return {
    id: r.id,
    trip_id: r.trip_id,
    date: r.day_id ? dateById.get(r.day_id) ?? null : null,
    caption: r.caption,
    is_favorite: r.is_favorite,
    sort_order: r.sort_order,
    mime: "image/jpeg",
    width: r.width ?? 0,
    height: r.height ?? 0,
    created_at: r.created_at,
    url,
  };
}

interface MemoryRaw {
  dayRows: Tables<"days">[];
  photoRows: Tables<"photos">[];
  dateById: Map<string, string>;
}

/** Load every day-memory + photo across the space's trips. */
async function fetchMemoryRaw(spaceId: string): Promise<MemoryRaw> {
  const supabase = getBrowserClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id")
    .eq("space_id", spaceId);
  const tripIds = (trips ?? []).map((t) => t.id);
  if (tripIds.length === 0) {
    return { dayRows: [], photoRows: [], dateById: new Map() };
  }
  const [{ data: days }, { data: photos }] = await Promise.all([
    supabase.from("days").select("*").in("trip_id", tripIds),
    supabase.from("photos").select("*").in("trip_id", tripIds),
  ]);
  const dayRows = days ?? [];
  const dateById = new Map(dayRows.map((d) => [d.id, d.date]));
  return { dayRows, photoRows: photos ?? [], dateById };
}

/** Batch-sign any storage paths we don't already have a URL for. */
async function signMissing(
  supabase: SupabaseClient,
  rows: Tables<"photos">[],
  cache: Map<string, string>,
): Promise<void> {
  const missing = [
    ...new Set(rows.map((r) => r.storage_path).filter((p) => !cache.has(p))),
  ];
  if (missing.length === 0) return;
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(missing, SIGNED_URL_TTL);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) cache.set(item.path, item.signedUrl);
  }
}

function buildRecords(raw: MemoryRaw, cache: Map<string, string>): PhotoRecord[] {
  return raw.photoRows.map((r) =>
    rowToPhoto(r, raw.dateById, cache.get(r.storage_path) ?? ""),
  );
}

function SupabaseMemoryProvider({
  spaceId,
  userId,
  children,
}: {
  spaceId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [days, setDays] = React.useState<DayMemory[]>([]);
  const [photos, setPhotos] = React.useState<PhotoRecord[]>([]);
  const [ready, setReady] = React.useState(false);

  // Closure-read refs + a storage_path→url cache. The cache means a refetch
  // never re-signs a URL we already have, and a just-uploaded photo keeps
  // showing its local object URL (no sign round-trip, no flicker on the echo).
  const photosRef = React.useRef<PhotoRecord[]>([]);
  const urlCacheRef = React.useRef<Map<string, string>>(new Map());
  const localUrlsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Initial load + live channel. A debounced refetch collapses a burst of row
  // writes (a multi-photo upload) into one authoritative reload.
  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const reload = async () => {
      const supabase = getBrowserClient();
      const raw = await fetchMemoryRaw(spaceId);
      await signMissing(supabase, raw.photoRows, urlCacheRef.current);
      if (!active) return;
      setDays(raw.dayRows.map(rowToDayMemory));
      setPhotos(buildRecords(raw, urlCacheRef.current));
    };

    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void reload(), 250);
    };

    void reload().then(() => {
      if (active) setReady(true);
    });

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`memory:${spaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos" },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "days" },
        scheduleReload,
      )
      .subscribe();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [spaceId]);

  // Revoke the object URLs we minted for optimistic previews on unmount.
  React.useEffect(() => {
    const urls = localUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const value = React.useMemo<MemoryContextValue>(() => {
    const supabase = getBrowserClient();
    return {
      ready,

      getDay: (tripId, date) => {
        const d = days.find((x) => x.trip_id === tripId && x.date === date);
        return d && !isEmptyDay(d) ? d : null;
      },

      getTripDays: (tripId) =>
        days.filter((d) => d.trip_id === tripId && !isEmptyDay(d)),

      // Note + rating are disjoint columns, so the two setters never clobber
      // each other; upsert on (trip_id, date) find-or-creates the shared row.
      setDayNote: async (tripId, date, note) => {
        const clean = cleanStr(note);
        setDays((prev) => upsertDay(prev, tripId, date, { note: clean }));
        const { error } = await supabase
          .from("days")
          .upsert(
            { trip_id: tripId, date, summary_note: clean },
            { onConflict: "trip_id,date" },
          );
        if (error) setDays(days);
      },

      setDayRating: async (tripId, date, rating) => {
        setDays((prev) => upsertDay(prev, tripId, date, { rating }));
        const { error } = await supabase
          .from("days")
          .upsert(
            { trip_id: tripId, date, rating },
            { onConflict: "trip_id,date" },
          );
        if (error) setDays(days);
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

        const dayId = await ensureDay(supabase, tripId, date);
        const group = photosRef.current.filter(
          (p) => p.trip_id === tripId && p.date === date,
        );
        let order = group.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1;

        const added: PhotoRecord[] = [];
        for (const file of list) {
          const c = await compressImage(file);
          const id = newId();
          const path = `${spaceId}/${tripId}/${id}`;
          const up = await supabase.storage
            .from(BUCKET)
            .upload(path, c.blob, { contentType: c.mime, upsert: false });
          if (up.error) continue;
          const sortOrder = order++;
          const { error } = await supabase.from("photos").insert({
            id,
            trip_id: tripId,
            day_id: dayId,
            storage_path: path,
            caption: null,
            is_favorite: false,
            width: c.width,
            height: c.height,
            sort_order: sortOrder,
            uploaded_by: userId,
          });
          if (error) {
            await supabase.storage.from(BUCKET).remove([path]); // unwind the orphan
            continue;
          }
          const url = URL.createObjectURL(c.blob);
          localUrlsRef.current.add(url);
          urlCacheRef.current.set(path, url);
          added.push({
            id,
            trip_id: tripId,
            date,
            caption: null,
            is_favorite: false,
            sort_order: sortOrder,
            mime: c.mime,
            width: c.width,
            height: c.height,
            created_at: new Date().toISOString(),
            url,
          });
        }
        if (added.length) setPhotos((prev) => [...prev, ...added]);
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
        const upd: { caption?: string | null; is_favorite?: boolean } = {};
        if (patch.caption !== undefined) upd.caption = cleanStr(patch.caption);
        if (patch.is_favorite !== undefined) upd.is_favorite = patch.is_favorite;
        const { error } = await supabase.from("photos").update(upd).eq("id", id);
        if (error) setPhotos(photos);
      },

      deletePhoto: async (id) => {
        const current = photosRef.current.find((p) => p.id === id);
        if (!current) return;
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        const path = `${spaceId}/${current.trip_id}/${id}`;
        const cached = urlCacheRef.current.get(path);
        if (cached && localUrlsRef.current.has(cached)) {
          URL.revokeObjectURL(cached);
          localUrlsRef.current.delete(cached);
        }
        urlCacheRef.current.delete(path);
        const { error } = await supabase.from("photos").delete().eq("id", id);
        if (error) {
          setPhotos(photos);
          return;
        }
        await supabase.storage.from(BUCKET).remove([path]);
      },
    };
  }, [days, photos, ready, spaceId, userId]);

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. Real backend when Supabase is configured and the space is
// resolved; otherwise the preview backend. The context interface is identical.
// ---------------------------------------------------------------------------
export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, userId } = useSpace();
  if (isSupabaseConfigured && spaceId && userId) {
    return (
      <SupabaseMemoryProvider spaceId={spaceId} userId={userId}>
        {children}
      </SupabaseMemoryProvider>
    );
  }
  return <PreviewMemoryProvider>{children}</PreviewMemoryProvider>;
}
