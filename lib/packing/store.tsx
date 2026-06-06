"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SAMPLE_PACKING } from "./sample";
import { sortPacking, type PackingDraft, type PackingItem, type PackingPatch } from "./types";

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
// Provider entry. The Supabase-backed list (shared writes + realtime so a tick
// from your person shows up live) lands behind this same interface; preview is
// the current runtime.
// ---------------------------------------------------------------------------
export function PackingProvider({ children }: { children: React.ReactNode }) {
  void isSupabaseConfigured;
  return <PreviewPackingProvider>{children}</PreviewPackingProvider>;
}
