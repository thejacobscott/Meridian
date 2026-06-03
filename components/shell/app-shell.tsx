import { type ReactNode } from "react";
import { SideRail } from "./side-rail";
import { BottomNav } from "./bottom-nav";
import { PageTransition } from "./page-transition";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh">
      <SideRail />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[680px] px-5 pt-6 pb-32 sm:px-6 md:pb-16">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
