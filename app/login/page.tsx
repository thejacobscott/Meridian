import Link from "next/link";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sign in · Meridian" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[22rem] text-center">
        <p className="eyebrow">A private place for two</p>
        <h1 className="mt-3 font-display text-[2.75rem] leading-none tracking-[-0.02em]">
          Meridian
        </h1>
        <p className="mx-auto mt-4 max-w-[18rem] text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
          Plan every trip together. Keep every trip forever.
        </p>

        <div className="mt-10">
          {isSupabaseConfigured ? (
            <MagicLinkForm initialError={error} />
          ) : (
            <div className="rounded-card border border-line bg-surface/70 px-6 py-7">
              <p className="text-pretty text-sm leading-relaxed text-ink-soft">
                Sign-in switches on once Supabase is connected. Until then, the
                door&apos;s open.
              </p>
              <Link
                href="/"
                className={buttonVariants({ variant: "primary", size: "md" }) + " mt-5 w-full"}
              >
                Look around
              </Link>
            </div>
          )}
        </div>
      </div>

      <p className="mt-14 text-xs text-ink-soft/70">Two of us, one map.</p>
    </main>
  );
}
