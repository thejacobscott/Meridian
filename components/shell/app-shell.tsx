import { type ReactNode } from "react";
import { SideRail } from "./side-rail";
import { BottomNav } from "./bottom-nav";
import { PageTransition } from "./page-transition";
import { OfflineBar } from "./offline-bar";
import { Welcome } from "@/components/onboarding/welcome";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh">
      <OfflineBar />
      <SideRail />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[680px] px-5 pt-6 pb-32 sm:px-6 md:pb-16">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <BottomNav />
      <Welcome />
    </div>
  );
}
