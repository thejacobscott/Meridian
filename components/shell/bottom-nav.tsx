"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { navItems } from "./nav-items";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden print:!hidden">
      <div className="mx-auto mb-3 flex w-[min(420px,calc(100%-1.5rem))] items-center justify-around rounded-full border border-line bg-surface/85 p-1.5 shadow-lift backdrop-blur-md">
        {navItems.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-accent/10"
                  transition={spring}
                />
              )}
              <Icon
                size={20}
                strokeWidth={1.6}
                className={cn(
                  "relative z-10 transition-colors",
                  active ? "text-accent-deep" : "text-ink-soft",
                )}
              />
              <span
                className={cn(
                  "relative z-10 text-[0.62rem] font-medium tracking-wide transition-colors",
                  active ? "text-accent-deep" : "text-ink-soft",
                )}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
