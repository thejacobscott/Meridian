"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { navItems } from "./nav-items";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export function SideRail() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-paper/60 px-4 py-7 md:flex">
      <Link href="/" className="px-3">
        <span className="font-display text-[1.7rem] tracking-tight">
          Meridian
        </span>
      </Link>

      <nav className="mt-10 flex flex-col gap-1">
        {navItems.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="relative flex items-center gap-3 rounded-full px-3 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="rail-pill"
                  className="absolute inset-0 rounded-full bg-accent/10"
                  transition={spring}
                />
              )}
              <Icon
                size={19}
                strokeWidth={1.6}
                className={cn(
                  "relative z-10 transition-colors",
                  active ? "text-accent-deep" : "text-ink-soft",
                )}
              />
              <span
                className={cn(
                  "relative z-10 text-[0.95rem] transition-colors",
                  active ? "font-medium text-ink" : "text-ink-soft",
                )}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto px-3 text-xs text-ink-soft/80">
        Two of us, one map.
      </p>
    </aside>
  );
}
