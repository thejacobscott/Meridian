"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { useSpace } from "@/lib/space/store";
import { previewKey } from "@/lib/preview/hubs";
import type { MemberSlot } from "@/lib/space/types";
import { SAMPLE_WISHLIST } from "./sample";
import type { WishlistDraft, WishlistItem, WishlistKind } from "./types";

/** Normalize a stored/remote kind to the two we know, defaulting to place. */
function asKind(v: unknown): WishlistKind {
  return v === "date" ? "date" : "place";
}

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
    const raw = window.localStorage.getItem(previewKey(STORAGE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Backfill `kind` for boards saved before date ideas existed.
    return (parsed as WishlistItem[]).map((it) => ({ ...it, kind: asKind(it.kind) }));
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
      window.localStorage.setItem(previewKey(STORAGE_KEY), JSON.stringify(items));
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
        const kind = draft.kind ?? "place";
        const item: WishlistItem = {
          id: newId(),
          kind,
          title: draft.title.trim() || (kind === "date" ? "A date idea" : "A someday"),
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
                  kind: patch.kind ?? it.kind,
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
// Supabase backend — the shared someday board in `wishlist_items`, scoped by
// space. votes_a/votes_b are disjoint per-partner columns, so two hearts from
// two devices never clobber each other; a debounced refetch reconciles the rest.
//
// The DB stores `added_by` as a user uuid, but the board attributes by *slot*
// (a/b). Slots are the stable created_at order of the two members (same as the
// space store), so we resolve uuid→slot through a per-space map loaded once.
// ---------------------------------------------------------------------------
interface SlotMap {
  slotByUserId: Map<string, MemberSlot>;
}

const slotMapCache = new Map<string, Promise<SlotMap>>();

function loadSlotMap(spaceId: string): Promise<SlotMap> {
  let p = slotMapCache.get(spaceId);
  if (!p) {
    p = (async () => {
      const supabase = getBrowserClient();
      const { data } = await supabase
        .from("members")
        .select("user_id, created_at")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: true });
      const rows = data ?? [];
      const slotByUserId = new Map<string, MemberSlot>();
      if (rows[0]) slotByUserId.set(rows[0].user_id, "a");
      if (rows[1]) slotByUserId.set(rows[1].user_id, "b");
      return { slotByUserId };
    })();
    slotMapCache.set(spaceId, p);
  }
  return p;
}

function rowToItem(
  r: Tables<"wishlist_items">,
  slotByUserId: Map<string, MemberSlot>,
): WishlistItem {
  return {
    id: r.id,
    kind: asKind(r.kind),
    title: r.title,
    place: r.place,
    note: r.note,
    added_by: r.added_by ? slotByUserId.get(r.added_by) ?? null : null,
    votes_a: r.votes_a,
    votes_b: r.votes_b,
    promoted_to_trip_id: r.promoted_to_trip_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

async function fetchWishlist(spaceId: string): Promise<WishlistItem[]> {
  const supabase = getBrowserClient();
  const [{ data }, { slotByUserId }] = await Promise.all([
    supabase.from("wishlist_items").select("*").eq("space_id", spaceId),
    loadSlotMap(spaceId),
  ]);
  return (data ?? []).map((r) => rowToItem(r, slotByUserId));
}

function SupabaseWishlistProvider({
  spaceId,
  userId,
  children,
}: {
  spaceId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = React.useState<WishlistItem[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fetchWishlist(spaceId).then((rows) => {
          if (active) setItems(rows);
        });
      }, 200);
    };

    void fetchWishlist(spaceId).then((rows) => {
      if (!active) return;
      setItems(rows);
      setReady(true);
    });

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`wishlist:${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wishlist_items",
          filter: `space_id=eq.${spaceId}`,
        },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [spaceId]);

  const value = React.useMemo<WishlistContextValue>(() => {
    const supabase = getBrowserClient();
    return {
      ready,
      items,

      addItem: async (draft) => {
        const { slotByUserId } = await loadSlotMap(spaceId);
        const mySlot = slotByUserId.get(userId) ?? "a";
        const now = new Date().toISOString();
        const kind = draft.kind ?? "place";
        const item: WishlistItem = {
          id: newId(),
          kind,
          title: draft.title.trim() || (kind === "date" ? "A date idea" : "A someday"),
          place: cleanStr(draft.place),
          note: cleanStr(draft.note),
          // The adder is always the signed-in user, so attribute by their slot.
          added_by: mySlot,
          votes_a: mySlot === "a" ? 1 : 0,
          votes_b: mySlot === "b" ? 1 : 0,
          promoted_to_trip_id: null,
          created_at: now,
          updated_at: now,
        };
        setItems((prev) => [item, ...prev]);
        const { error } = await supabase.from("wishlist_items").insert({
          id: item.id,
          space_id: spaceId,
          kind: item.kind,
          title: item.title,
          place: item.place,
          note: item.note,
          added_by: userId,
          votes_a: item.votes_a,
          votes_b: item.votes_b,
        });
        if (error) {
          setItems(items);
          throw error;
        }
        return item;
      },

      updateItem: async (id, patch) => {
        const current = items.find((it) => it.id === id);
        if (!current) return;
        const next: WishlistItem = {
          ...current,
          kind: patch.kind ?? current.kind,
          title: patch.title?.trim() || current.title,
          place: patch.place !== undefined ? cleanStr(patch.place) : current.place,
          note: patch.note !== undefined ? cleanStr(patch.note) : current.note,
          updated_at: new Date().toISOString(),
        };
        setItems((prev) => prev.map((it) => (it.id === id ? next : it)));
        const upd: {
          kind?: string;
          title?: string;
          place?: string | null;
          note?: string | null;
        } = {};
        if (patch.kind !== undefined) upd.kind = next.kind;
        if (patch.title !== undefined) upd.title = next.title;
        if (patch.place !== undefined) upd.place = next.place;
        if (patch.note !== undefined) upd.note = next.note;
        const { error } = await supabase.from("wishlist_items").update(upd).eq("id", id);
        if (error) setItems(items);
      },

      removeItem: async (id) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
        if (error) setItems(items);
      },

      toggleVote: async (id, slot) => {
        const current = items.find((it) => it.id === id);
        if (!current) return;
        const key = slot === "a" ? "votes_a" : "votes_b";
        const nextVal = current[key] > 0 ? 0 : 1;
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? { ...it, [key]: nextVal, updated_at: new Date().toISOString() }
              : it,
          ),
        );
        const upd = slot === "a" ? { votes_a: nextVal } : { votes_b: nextVal };
        const { error } = await supabase.from("wishlist_items").update(upd).eq("id", id);
        if (error) setItems(items);
      },

      markPromoted: async (id, tripId) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? { ...it, promoted_to_trip_id: tripId, updated_at: new Date().toISOString() }
              : it,
          ),
        );
        const { error } = await supabase
          .from("wishlist_items")
          .update({ promoted_to_trip_id: tripId })
          .eq("id", id);
        if (error) setItems(items);
      },
    };
  }, [items, ready, spaceId, userId]);

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Provider entry. Real backend when Supabase is configured and the space is
// resolved; otherwise the preview backend. The context interface is identical.
// ---------------------------------------------------------------------------
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, userId } = useSpace();
  if (isSupabaseConfigured && spaceId && userId) {
    return (
      <SupabaseWishlistProvider spaceId={spaceId} userId={userId}>
        {children}
      </SupabaseWishlistProvider>
    );
  }
  return <PreviewWishlistProvider>{children}</PreviewWishlistProvider>;
}
