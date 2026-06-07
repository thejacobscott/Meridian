"use client";

import * as React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserClient } from "@/lib/supabase/client";
import { useSpace } from "@/lib/space/store";

/**
 * Live presence — is your person in the app right now, on the other side of the
 * ocean? This is the one signal that's purely *between trips*: seeing "here now"
 * appear under their clock is a quiet "they're awake and thinking about this
 * too." Built on Supabase Realtime Presence (ephemeral, never persisted): join
 * and leave are tracked over the websocket, so it clears itself when they close
 * the tab. No-ops in preview mode (there's no real other person to be present).
 */
interface PresenceContextValue {
  partnerOnline: boolean;
}

const PresenceContext = React.createContext<PresenceContextValue>({
  partnerOnline: false,
});

export function usePresence(): PresenceContextValue {
  return React.useContext(PresenceContext);
}

interface PresenceMeta {
  userId: string;
}

function SupabasePresenceProvider({
  spaceId,
  userId,
  children,
}: {
  spaceId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [partnerOnline, setPartnerOnline] = React.useState(false);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase.channel(`presence:${spaceId}`, {
      config: { presence: { key: userId } },
    });

    // Anyone tracked whose id isn't mine is my person (online from some device
    // of theirs). Reading the tracked payload rather than the channel key makes
    // this independent of how the key was assigned, and dedupes my own tabs.
    const recompute = () => {
      const state = channel.presenceState<PresenceMeta>();
      const present = new Set<string>();
      for (const metas of Object.values(state)) {
        for (const m of metas) present.add(m.userId);
      }
      setPartnerOnline([...present].some((id) => id !== userId));
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ userId } satisfies PresenceMeta);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [spaceId, userId]);

  const value = React.useMemo(() => ({ partnerOnline }), [partnerOnline]);
  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { spaceId, userId } = useSpace();
  if (isSupabaseConfigured && spaceId && userId) {
    return (
      <SupabasePresenceProvider spaceId={spaceId} userId={userId}>
        {children}
      </SupabasePresenceProvider>
    );
  }
  return (
    <PresenceContext.Provider value={{ partnerOnline: false }}>
      {children}
    </PresenceContext.Provider>
  );
}
