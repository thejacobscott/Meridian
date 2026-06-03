import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
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

  return <AppShell>{children}</AppShell>;
}
