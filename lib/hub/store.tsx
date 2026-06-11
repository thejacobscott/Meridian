"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { useSpace } from "@/lib/space/store";
import type { MemberSlot } from "@/lib/space/types";
import { SAMPLE_HUB } from "./sample";
import type { HubDraft, HubKind, HubNote } from "./types";

interface HubContextValue {
  /** False until the client store has hydrated from storage. */
  ready: boolean;
  notes: HubNote[];
  /** Post a note (kind "note" + body) or log a moment (kind "miss"/etc.). */
  post: (draft: HubDraft) => Promise<void>;
  /** Remove one of your own entries. */
  remove: (id: string) => Promise<void>;
}

const HubContext = React.createContext<HubContextValue | null>(null);

export function useHub(): HubContextValue {
  const ctx = React.useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used within <HubProvider>");
  return ctx;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `hub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asKind(v: unknown): HubKind {
  return v === "miss" || v === "facetime" || v === "meal" ? v : "note";
}

function cleanBody(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

// ---------------------------------------------------------------------------
// Preview backend — local, no Supabase. Seeds a sample timeline and persists to
// localStorage. On first run it also adopts the note written on the welcome
// screen, so that little message lands here as the very first entry.
// ---------------------------------------------------------------------------
const STORAGE_KEY = "meridian.hub.v1";
const WELCOME_NOTE_KEY = "meridian.welcome.note.v1";

function loadFromStorage(): HubNote[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return (parsed as HubNote[]).map((it) => ({ ...it, kind: asKind(it.kind) }));
  } catch {
    return null;
  }
}

/** Prepend the welcome-screen note (if one was written) to the seed. */
function seedWithWelcomeNote(): HubNote[] {
  try {
    const body = cleanBody(window.localStorage.getItem(WELCOME_NOTE_KEY));
    if (!body) return SAMPLE_HUB;
    const note: HubNote = {
      id: "hub-welcome-note",
      kind: "note",
      body,
      author: "a",
      created_at: new Date().toISOString(),
    };
    return [note, ...SAMPLE_HUB];
  } catch {
    return SAMPLE_HUB;
  }
}

function PreviewHubProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = React.useState<HubNote[]>(SAMPLE_HUB);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(stored ?? seedWithWelcomeNote());
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // best-effort
    }
  }, [notes, ready]);

  const value = React.useMemo<HubContextValue>(() => {
    return {
      ready,
      notes,
      post: async (draft) => {
        const note: HubNote = {
          id: newId(),
          kind: draft.kind ?? "note",
          body: cleanBody(draft.body),
          // Preview is always "you" — slot a.
          author: "a",
          created_at: new Date().toISOString(),
        };
        setNotes((prev) => [note, ...prev]);
      },
      remove: async (id) => {
        setNotes((prev) => prev.filter((it) => it.id !== id));
      },
    };
  }, [ready, notes]);

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

// ---------------------------------------------------------------------------
// Supabase backend — the shared hub in `hub_notes`, scoped by space, realtime.
// Like the wishlist, the DB stores `author` as a user uuid; the timeline
// attributes by *slot* (a/b), resolved through a per-space uuid→slot map.
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

function rowToNote(
  r: Tables<"hub_notes">,
  slotByUserId: Map<string, MemberSlot>,
): HubNote {
  return {
    id: r.id,
    kind: asKind(r.kind),
    body: r.body,
    author: r.author ? slotByUserId.get(r.author) ?? null : null,
    created_at: r.created_at,
  };
}

async function fetchHub(spaceId: string): Promise<HubNote[]> {
  const supabase = getBrowserClient();
  const [{ data }, { slotByUserId }] = await Promise.all([
    supabase
      .from("hub_notes")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false }),
    loadSlotMap(spaceId),
  ]);
  return (data ?? []).map((r) => rowToNote(r, slotByUserId));
}

function SupabaseHubProvider({
  spaceId,
  userId,
  children,
}: {
  spaceId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [notes, setNotes] = React.useState<HubNote[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fetchHub(spaceId).then((rows) => {
          if (active) setNotes(rows);
        });
      }, 200);
    };

    void fetchHub(spaceId).then((rows) => {
      if (!active) return;
      setNotes(rows);
      setReady(true);
    });

    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`hub:${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hub_notes",
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

  const value = React.useMemo<HubContextValue>(() => {
    const supabase = getBrowserClient();
    return {
      ready,
      notes,
      post: async (draft) => {
        const { slotByUserId } = await loadSlotMap(spaceId);
        const mySlot = slotByUserId.get(userId) ?? "a";
        const note: HubNote = {
          id: newId(),
          kind: draft.kind ?? "note",
          body: cleanBody(draft.body),
          author: mySlot,
          created_at: new Date().toISOString(),
        };
        setNotes((prev) => [note, ...prev]);
        const { error } = await supabase.from("hub_notes").insert({
          id: note.id,
          space_id: spaceId,
          author: userId,
          kind: note.kind,
          body: note.body,
        });
        if (error) setNotes(notes);
      },
      remove: async (id) => {
        setNotes((prev) => prev.filter((it) => it.id !== id));
        const { error } = await supabase.from("hub_notes").delete().eq("id", id);
        if (error) setNotes(notes);
      },
    };
  }, [ready, notes, spaceId, userId]);

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

// ---------------------------------------------------------------------------
// Provider entry. Real backend when Supabase is configured and the space is
// resolved; otherwise the preview backend. The context interface is identical.
// ---------------------------------------------------------------------------
export function HubProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, userId } = useSpace();
  if (isSupabaseConfigured && spaceId && userId) {
    return (
      <SupabaseHubProvider spaceId={spaceId} userId={userId}>
        {children}
      </SupabaseHubProvider>
    );
  }
  return <PreviewHubProvider>{children}</PreviewHubProvider>;
}
