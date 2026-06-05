import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { EventsProvider } from "@/lib/itinerary/store";
import { MemoryProvider } from "@/lib/memory/store";
import { TripsProvider } from "@/lib/trips/store";
import { SpaceProvider } from "@/lib/space/store";
import { WishlistProvider } from "@/lib/wishlist/store";
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
  }

  // TripsProvider sits above AppShell (and its per-route PageTransition) so trip
  // state survives list → detail navigation — required for the shared-element morph.
  // EventsProvider and MemoryProvider hold the itinerary + scrapbook stores on
  // the same footing. SpaceProvider (the two of you + time zones) and
  // WishlistProvider (the someday board) join them for the long-distance layer.
  return (
    <TripsProvider>
      <EventsProvider>
        <MemoryProvider>
          <SpaceProvider>
            <WishlistProvider>
              <AppShell>{children}</AppShell>
            </WishlistProvider>
          </SpaceProvider>
        </MemoryProvider>
      </EventsProvider>
    </TripsProvider>
  );
}
