"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_SPACE,
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
// Provider entry. The Supabase-backed space (real members, plus the realtime
// presence/typing channel for the long-distance layer) lands behind this same
// interface; preview is the current runtime.
// ---------------------------------------------------------------------------
export function SpaceProvider({ children }: { children: React.ReactNode }) {
  void isSupabaseConfigured;
  return <PreviewSpaceProvider>{children}</PreviewSpaceProvider>;
}
