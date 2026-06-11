"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { useSpace } from "@/lib/space/store";
import { previewKey } from "@/lib/preview/hubs";
import { SAMPLE_PACKING } from "./sample";
import {
  sortPacking,
  type PackingDraft,
  type PackingItem,
  type PackingPatch,
  type PackOwner,
} from "./types";

interface PackingContextValue {
  /** False until the client store has hydrated from storage. */
  ready: boolean;
  /** One trip's items, in display order (still-to-pack first). */
  getItems: (tripId: string) => PackingItem[];
  addItem: (tripId: string, draft: PackingDraft) => Promise<PackingItem>;
  updateItem: (id: string, patch: PackingPatch) => Promise<void>;
  /** Convenience: flip one item's packed state. */
  togglePacked: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

const PackingContext = React.createContext<PackingContextValue | null>(null);

export function usePacking(): PackingContextValue {
  const ctx = React.useContext(PackingContext);
  if (!ctx) throw new Error("usePacking must be used within <PackingProvider>");
  return ctx;
}

/** One trip's items, memoized in display order. */
export function useTripPacking(tripId: string): {
  items: PackingItem[];
  ready: boolean;
} {
  const ctx = usePacking();
  const items = React.useMemo(() => ctx.getItems(tripId), [ctx, tripId]);
  return { items, ready: ctx.ready };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampQty(qty: number | undefined, fallback = 1): number {
  if (qty == null || Number.isNaN(qty)) return fallback;
  return Math.min(99, Math.max(1, Math.round(qty)));
}

// ---------------------------------------------------------------------------
// Preview backend — local, no Supabase. Seeds the Lisbon sample list and
// persists changes to localStorage so the checklist is fully demoable offline.
// ---------------------------------------------------------------------------
const STORAGE_KEY = "meridian.packing.v1";

function loadFromStorage(): PackingItem[] | null {
  try {
    const raw = window.localStorage.getItem(previewKey(STORAGE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PackingItem[]) : null;
  } catch {
    return null;
  }
}

function PreviewPackingProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<PackingItem[]>(SAMPLE_PACKING);
  const [ready, setReady] = React.useState(false);

  // Hydrate post-mount; storage isn't readable during SSR.
  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setItems(stored);
    setReady(true);
  }, []);

  // Persist after hydration so we never clobber stored items with the seed.
  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(previewKey(STORAGE_KEY), JSON.stringify(items));
    } catch {
      // best-effort
    }
  }, [items, ready]);

  const value = React.useMemo<PackingContextValue>(() => {
    return {
      ready,

      getItems: (tripId) =>
        sortPacking(items.filter((i) => i.trip_id === tripId)),

      addItem: async (tripId, draft) => {
        const item: PackingItem = {
          id: newId(),
          trip_id: tripId,
          label: draft.label.trim() || "Something",
          qty: clampQty(draft.qty),
          owner: draft.owner ?? "shared",
          is_packed: false,
          created_at: new Date().toISOString(),
        };
        setItems((prev) => [...prev, item]);
        return item;
      },

      updateItem: async (id, patch) => {
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== id) return i;
            return {
              ...i,
              label:
                patch.label !== undefined ? patch.label.trim() || i.label : i.label,
              qty: patch.qty !== undefined ? clampQty(patch.qty, i.qty) : i.qty,
              owner: patch.owner !== undefined ? patch.owner : i.owner,
              is_packed:
                patch.is_packed !== undefined ? patch.is_packed : i.is_packed,
            };
          }),
        );
      },

      togglePacked: async (id) => {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, is_packed: !i.is_packed } : i)),
        );
      },

      removeItem: async (id) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      },
    };
  }, [items, ready]);

  return (
    <PackingContext.Provider value={value}>{children}</PackingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Supabase backend — items in `packing_items`, scoped by trip. `owner` is the
// same a/b/shared literal on both sides (no user mapping needed), and every
// column is independent, so two people ticking different items never collide.
// RLS scopes the broad subscription to this space's trips; a debounced refetch
// collapses a burst of writes into one authoritative reload.
// ---------------------------------------------------------------------------
function rowToPacking(r: Tables<"packing_items">): PackingItem {
  return {
    id: r.id,
    trip_id: r.trip_id,
    label: r.label,
    qty: r.qty,
    owner: r.owner,
    is_packed: r.is_packed,
    created_at: r.created_at,
  };
}

async function fetchPacking(spaceId: string): Promise<PackingItem[]> {
  const supabase = getBrowserClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id")
    .eq("space_id", spaceId);
  const tripIds = (trips ?? []).map((t) => t.id);
  if (tripIds.length === 0) return [];
  const { data } = await supabase
    .from("packing_items")
    .select("*")
    .in("trip_id", tripIds);
  return (data ?? []).map(rowToPacking);
}

function SupabasePackingProvider({
  spaceId,
  children,
}: {
  spaceId: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = React.useState<PackingItem[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fetchPacking(spaceId).then((rows) => {
          if (active) setItems(rows);
        });
      }, 200);
    };

    void fetchPacking(spaceId).then((rows) => {
      if (!active) return;
      setItems(rows);
      setReady(true);
    });

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`packing:${spaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "packing_items" },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [spaceId]);

  const value = React.useMemo<PackingContextValue>(() => {
    const supabase = getBrowserClient();
    return {
      ready,

      getItems: (tripId) => sortPacking(items.filter((i) => i.trip_id === tripId)),

      addItem: async (tripId, draft) => {
        const item: PackingItem = {
          id: newId(),
          trip_id: tripId,
          label: draft.label.trim() || "Something",
          qty: clampQty(draft.qty),
          owner: draft.owner ?? "shared",
          is_packed: false,
          created_at: new Date().toISOString(),
        };
        setItems((prev) => [...prev, item]);
        const { error } = await supabase.from("packing_items").insert({
          id: item.id,
          trip_id: tripId,
          label: item.label,
          qty: item.qty,
          owner: item.owner,
          is_packed: false,
        });
        if (error) {
          setItems(items);
          throw error;
        }
        return item;
      },

      updateItem: async (id, patch) => {
        const current = items.find((i) => i.id === id);
        if (!current) return;
        const next: PackingItem = {
          ...current,
          label:
            patch.label !== undefined ? patch.label.trim() || current.label : current.label,
          qty: patch.qty !== undefined ? clampQty(patch.qty, current.qty) : current.qty,
          owner: patch.owner !== undefined ? patch.owner : current.owner,
          is_packed: patch.is_packed !== undefined ? patch.is_packed : current.is_packed,
        };
        setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
        const upd: { label?: string; qty?: number; owner?: PackOwner; is_packed?: boolean } = {};
        if (patch.label !== undefined) upd.label = next.label;
        if (patch.qty !== undefined) upd.qty = next.qty;
        if (patch.owner !== undefined) upd.owner = next.owner;
        if (patch.is_packed !== undefined) upd.is_packed = next.is_packed;
        const { error } = await supabase.from("packing_items").update(upd).eq("id", id);
        if (error) setItems(items);
      },

      togglePacked: async (id) => {
        const current = items.find((i) => i.id === id);
        if (!current) return;
        const nextPacked = !current.is_packed;
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, is_packed: nextPacked } : i)),
        );
        const { error } = await supabase
          .from("packing_items")
          .update({ is_packed: nextPacked })
          .eq("id", id);
        if (error) setItems(items);
      },

      removeItem: async (id) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        const { error } = await supabase.from("packing_items").delete().eq("id", id);
        if (error) setItems(items);
      },
    };
  }, [items, ready]);

  return (
    <PackingContext.Provider value={value}>{children}</PackingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Provider entry. Real backend when Supabase is configured and the space is
// resolved; otherwise the preview backend. The context interface is identical.
// ---------------------------------------------------------------------------
export function PackingProvider({ children }: { children: React.ReactNode }) {
  const { spaceId } = useSpace();
  if (isSupabaseConfigured && spaceId) {
    return <SupabasePackingProvider spaceId={spaceId}>{children}</SupabasePackingProvider>;
  }
  return <PreviewPackingProvider>{children}</PreviewPackingProvider>;
}
