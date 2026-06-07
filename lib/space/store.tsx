"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  DEFAULT_SPACE,
  FALLBACK_TZ,
  type MemberPatch,
  type MemberSlot,
  type SpaceMember,
  type SpaceState,
} from "./types";

interface SpaceContextValue {
  /** False until the client store has hydrated from storage. */
  ready: boolean;
  space: SpaceState;
  /** Slot "a" — you, on this device. */
  you: SpaceMember;
  /** Slot "b" — your person. */
  partner: SpaceMember;
  member: (slot: MemberSlot) => SpaceMember;
  updateMember: (slot: MemberSlot, patch: MemberPatch) => Promise<void>;
  setSpaceName: (name: string) => Promise<void>;
  /** The current space id (real backend only; null in preview). */
  spaceId: string | null;
  /** The signed-in user's id (real backend only; null in preview). */
  userId: string | null;
}

const SpaceContext = React.createContext<SpaceContextValue | null>(null);

export function useSpace(): SpaceContextValue {
  const ctx = React.useContext(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used within <SpaceProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Preview backend — local, no Supabase. The two-person space lives in
// localStorage so the clocks + wishlist attribution work fully offline.
// ---------------------------------------------------------------------------
const STORAGE_KEY = "meridian.space.v1";

function loadFromStorage(): SpaceState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.name !== "string" ||
      !Array.isArray(parsed.members) ||
      parsed.members.length !== 2
    ) {
      return null;
    }
    return parsed as SpaceState;
  } catch {
    return null;
  }
}

function PreviewSpaceProvider({ children }: { children: React.ReactNode }) {
  const [space, setSpace] = React.useState<SpaceState>(DEFAULT_SPACE);
  const [ready, setReady] = React.useState(false);

  // Hydrate post-mount; storage isn't readable during SSR. The synchronous
  // setState here is intentional (mirrors the trips/events stores).
  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpace(stored ?? DEFAULT_SPACE);
    setReady(true);
  }, []);

  // Persist after hydration so we never clobber stored values with the seed.
  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(space));
    } catch {
      // best-effort
    }
  }, [space, ready]);

  const value = React.useMemo<SpaceContextValue>(() => {
    const [a, b] = space.members;
    return {
      ready,
      space,
      you: a,
      partner: b,
      member: (slot) => (slot === "a" ? a : b),
      spaceId: null,
      userId: null,
      updateMember: async (slot, patch) => {
        setSpace((prev) => {
          const members = prev.members.map((m) =>
            m.slot === slot ? { ...m, ...patch } : m,
          ) as [SpaceMember, SpaceMember];
          return { ...prev, members };
        });
      },
      setSpaceName: async (name) => {
        setSpace((prev) => ({ ...prev, name }));
      },
    };
  }, [space, ready]);

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

// ---------------------------------------------------------------------------
// Supabase backend. The space + both members come from the server (passed as
// `initial` by the app layout, so there's no first-paint flash), then a realtime
// channel keeps names / cities / time zones live across both devices.
//
// Slots are a *shared, stable* identity, not "whoever's on this device": slot
// "a" is the space creator (first member by created_at) and "b" is the joiner —
// the same a/b that `spaces.home_tz_a/b`, `wishlist.votes_a/b`, and packing
// `owner` key off. `you` is then whichever slot matches the signed-in user, so
// attribution is correct on both sides of the ocean.
// ---------------------------------------------------------------------------
export interface SpaceMemberRow {
  user_id: string;
  display_name: string | null;
  home_city: string | null;
  created_at: string;
}

export interface SpaceSnapshot {
  spaceId: string;
  userId: string;
  name: string;
  homeTzA: string | null;
  homeTzB: string | null;
  /** Both member rows (0, 1, or 2), in any order; sorted by created_at here. */
  members: SpaceMemberRow[];
}

/** Build the [you, partner] view + which slot is you from a raw snapshot. */
function deriveSpace(snap: SpaceSnapshot): {
  space: SpaceState;
  youSlot: MemberSlot;
} {
  const sorted = [...snap.members].sort((m, n) =>
    m.created_at.localeCompare(n.created_at),
  );
  const rowA = sorted[0];
  const rowB = sorted[1];

  const memberA: SpaceMember = {
    slot: "a",
    name: rowA?.display_name?.trim() || "You",
    city: rowA?.home_city ?? null,
    tz: snap.homeTzA || FALLBACK_TZ,
  };
  const memberB: SpaceMember = {
    slot: "b",
    name: rowB?.display_name?.trim() || "Your person",
    city: rowB?.home_city ?? null,
    tz: snap.homeTzB || FALLBACK_TZ,
  };

  // You're slot "a" unless the joiner's row is the one that's yours.
  const youSlot: MemberSlot =
    rowB?.user_id === snap.userId ? "b" : "a";

  return {
    space: { name: snap.name || "Us", members: [memberA, memberB] },
    youSlot,
  };
}

/** Apply an optimistic member edit to the raw snapshot, by slot. */
function patchSnapshot(
  snap: SpaceSnapshot,
  slot: MemberSlot,
  patch: MemberPatch,
): SpaceSnapshot {
  const sorted = [...snap.members].sort((m, n) =>
    m.created_at.localeCompare(n.created_at),
  );
  const target = slot === "a" ? sorted[0] : sorted[1];
  const next: SpaceSnapshot = {
    ...snap,
    homeTzA: patch.tz !== undefined && slot === "a" ? patch.tz : snap.homeTzA,
    homeTzB: patch.tz !== undefined && slot === "b" ? patch.tz : snap.homeTzB,
  };
  if (target && (patch.name !== undefined || patch.city !== undefined)) {
    next.members = snap.members.map((m) =>
      m.user_id === target.user_id
        ? {
            ...m,
            display_name: patch.name !== undefined ? patch.name : m.display_name,
            home_city: patch.city !== undefined ? patch.city : m.home_city,
          }
        : m,
    );
  }
  return next;
}

async function fetchSnapshot(
  spaceId: string,
  userId: string,
): Promise<SpaceSnapshot | null> {
  const supabase = getBrowserClient();
  const [{ data: space }, { data: members }] = await Promise.all([
    supabase
      .from("spaces")
      .select("name, home_tz_a, home_tz_b")
      .eq("id", spaceId)
      .single(),
    supabase
      .from("members")
      .select("user_id, display_name, home_city, created_at")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: true }),
  ]);
  if (!space) return null;
  return {
    spaceId,
    userId,
    name: space.name,
    homeTzA: space.home_tz_a,
    homeTzB: space.home_tz_b,
    members: (members ?? []) as SpaceMemberRow[],
  };
}

function SupabaseSpaceProvider({
  initial,
  children,
}: {
  initial: SpaceSnapshot;
  children: React.ReactNode;
}) {
  const [snap, setSnap] = React.useState<SpaceSnapshot>(initial);
  const { spaceId, userId } = initial;

  const refetch = React.useCallback(async () => {
    const next = await fetchSnapshot(spaceId, userId);
    if (next) setSnap(next);
  }, [spaceId, userId]);

  // Live updates: when the space row or either member row changes (your person
  // renames themselves, sets a city, moves time zone), pull a fresh snapshot.
  React.useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`space:${spaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spaces", filter: `id=eq.${spaceId}` },
        () => void refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members", filter: `space_id=eq.${spaceId}` },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [spaceId, refetch]);

  const { space, youSlot } = React.useMemo(() => deriveSpace(snap), [snap]);

  const value = React.useMemo<SpaceContextValue>(() => {
    const [a, b] = space.members;
    const you = youSlot === "a" ? a : b;
    const partner = youSlot === "a" ? b : a;
    return {
      ready: true,
      space,
      you,
      partner,
      member: (slot) => (slot === "a" ? a : b),
      spaceId,
      userId,
      updateMember: async (slot, patch) => {
        setSnap((prev) => patchSnapshot(prev, slot, patch));
        const supabase = getBrowserClient();
        if (patch.tz !== undefined) {
          await supabase
            .from("spaces")
            .update(
              slot === "a"
                ? { home_tz_a: patch.tz }
                : { home_tz_b: patch.tz },
            )
            .eq("id", spaceId);
        }
        // Names/cities live on your own member row — RLS only lets you edit yours.
        if ((patch.name !== undefined || patch.city !== undefined) && slot === youSlot) {
          const upd: { display_name?: string | null; home_city?: string | null } = {};
          if (patch.name !== undefined) upd.display_name = patch.name;
          if (patch.city !== undefined) upd.home_city = patch.city;
          await supabase
            .from("members")
            .update(upd)
            .eq("space_id", spaceId)
            .eq("user_id", userId);
        }
      },
      setSpaceName: async (name) => {
        setSnap((prev) => ({ ...prev, name }));
        await getBrowserClient().from("spaces").update({ name }).eq("id", spaceId);
      },
    };
  }, [space, youSlot, spaceId, userId]);

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. Real backend when Supabase is configured and the layout has
// handed us a server-fetched snapshot; otherwise the preview backend above.
// The context interface is identical either way.
// ---------------------------------------------------------------------------
export function SpaceProvider({
  initial = null,
  children,
}: {
  initial?: SpaceSnapshot | null;
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured && initial) {
    return (
      <SupabaseSpaceProvider initial={initial}>{children}</SupabaseSpaceProvider>
    );
  }
  return <PreviewSpaceProvider>{children}</PreviewSpaceProvider>;
}
