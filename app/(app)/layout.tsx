import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { EventsProvider } from "@/lib/itinerary/store";
import { MemoryProvider } from "@/lib/memory/store";
import { TripsProvider } from "@/lib/trips/store";
import { SpaceProvider, type SpaceSnapshot, type SpaceMemberRow } from "@/lib/space/store";
import { PresenceProvider } from "@/lib/presence/store";
import { WishlistProvider } from "@/lib/wishlist/store";
import { PackingProvider } from "@/lib/packing/store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Wraps the authenticated app in the editorial shell. When Supabase isn't
 * configured the app runs in open "preview mode" so the design still shows.
 * Once keys are present this becomes a real gate: signed-out visitors are sent
 * to /login, and signed-in visitors without a space are sent to /welcome.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  let spaceInitial: SpaceSnapshot | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: membership } = await supabase
      .from("members")
      .select("space_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) redirect("/welcome");

    // Fetch the space + both members once on the server so the client providers
    // start with real identity (no first-paint flash, SSR-consistent clocks).
    const [{ data: space }, { data: members }] = await Promise.all([
      supabase
        .from("spaces")
        .select("name, home_tz_a, home_tz_b")
        .eq("id", membership.space_id)
        .single(),
      supabase
        .from("members")
        .select("user_id, display_name, home_city, wake_start, wake_end, created_at")
        .eq("space_id", membership.space_id)
        .order("created_at", { ascending: true }),
    ]);

    if (space) {
      spaceInitial = {
        spaceId: membership.space_id,
        userId: user.id,
        name: space.name,
        homeTzA: space.home_tz_a,
        homeTzB: space.home_tz_b,
        members: (members ?? []) as SpaceMemberRow[],
      };
    }
  }

  // SpaceProvider is outermost: it resolves the shared space + which slot is you,
  // and the data stores below (trips, events, memory, wishlist, packing) read
  // `spaceId` / `you.slot` from it to scope their reads and attribute writes.
  // TripsProvider still sits above AppShell (and its per-route PageTransition) so
  // trip state survives list → detail navigation — required for the card→header morph.
  return (
    <SpaceProvider initial={spaceInitial}>
      <PresenceProvider>
        <TripsProvider>
          <EventsProvider>
            <MemoryProvider>
              <WishlistProvider>
                <PackingProvider>
                  <AppShell>{children}</AppShell>
                </PackingProvider>
              </WishlistProvider>
            </MemoryProvider>
          </EventsProvider>
        </TripsProvider>
      </PresenceProvider>
    </SpaceProvider>
  );
}
