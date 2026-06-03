import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = { title: "Welcome · Meridian" };

export default async function WelcomePage() {
  if (!isSupabaseConfigured) redirect("/");

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

  if (membership) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[24rem]">
        <div className="text-center">
          <p className="eyebrow">Welcome to Meridian</p>
          <h1 className="mt-3 font-display text-[2.25rem] leading-tight tracking-[-0.02em] text-balance">
            Make it the two of you
          </h1>
        </div>
        <div className="mt-9">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
