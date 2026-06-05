"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { MemberSlot } from "@/lib/space/types";
import { SAMPLE_WISHLIST } from "./sample";
import type { WishlistDraft, WishlistItem } from "./types";

interface WishlistContextValue {
  /** False until the client store has hydrated from storage. */
  ready: boolean;
  items: WishlistItem[];
  addItem: (draft: WishlistDraft) => Promise<WishlistItem>;
  updateItem: (id: string, patch: WishlistDraft) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  /** Toggle one partner's heart (0 ↔ 1) on an item. */
  toggleVote: (id: string, slot: MemberSlot) => Promise<void>;
  /** Link a someday to the trip it became (keeps the dream→plan thread). */
  markPromoted: (id: string, tripId: string) => Promise<void>;
}

const WishlistContext = React.createContext<WishlistContextValue | null>(null);

export function useWishlist(): WishlistContextValue {
  const ctx = React.useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within <WishlistProvider>");
  return ctx;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `wish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

// ---------------------------------------------------------------------------
// Preview backend — local, no Supabase. Seeds the sample someday list and
// persists changes to localStorage so the board is fully demoable offline.
// ---------------------------------------------------------------------------
const STORAGE_KEY = "meridian.wishlist.v1";

function loadFromStorage(): WishlistItem[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WishlistItem[]) : null;
  } catch {
    return null;
  }
}

function PreviewWishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<WishlistItem[]>(SAMPLE_WISHLIST);
  const [ready, setReady] = React.useState(false);

  // Hydrate post-mount; storage isn't readable during SSR.
  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(stored ?? SAMPLE_WISHLIST);
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

  const value = React.useMemo<WishlistContextValue>(() => {
    return {
      ready,
      items,

      addItem: async (draft) => {
        const now = new Date().toISOString();
        const by = draft.added_by ?? "a";
        const item: WishlistItem = {
          id: newId(),
          title: draft.title.trim() || "A someday",
          place: cleanStr(draft.place),
          note: cleanStr(draft.note),
          added_by: by,
          // Whoever adds it clearly wants it — pre-heart their side.
          votes_a: by === "a" ? 1 : 0,
          votes_b: by === "b" ? 1 : 0,
          promoted_to_trip_id: null,
          created_at: now,
          updated_at: now,
        };
        setItems((prev) => [item, ...prev]);
        return item;
      },

      updateItem: async (id, patch) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  title: patch.title?.trim() || it.title,
                  place:
                    patch.place !== undefined ? cleanStr(patch.place) : it.place,
                  note:
                    patch.note !== undefined ? cleanStr(patch.note) : it.note,
                  updated_at: new Date().toISOString(),
                }
              : it,
          ),
        );
      },

      removeItem: async (id) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
      },

      toggleVote: async (id, slot) => {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== id) return it;
            const key = slot === "a" ? "votes_a" : "votes_b";
            return {
              ...it,
              [key]: it[key] > 0 ? 0 : 1,
              updated_at: new Date().toISOString(),
            };
          }),
        );
      },

      markPromoted: async (id, tripId) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  promoted_to_trip_id: tripId,
                  updated_at: new Date().toISOString(),
                }
              : it,
          ),
        );
      },
    };
  }, [items, ready]);

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Provider entry. The Supabase-backed board (shared writes + realtime so a new
// someday or a heart from your person appears live, plus comments/reactions on
// trips) lands behind this same interface; preview is the current runtime.
// ---------------------------------------------------------------------------
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  void isSupabaseConfigured;
  return <PreviewWishlistProvider>{children}</PreviewWishlistProvider>;
}
