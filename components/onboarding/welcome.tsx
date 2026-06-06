"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookHeart, Clock, Compass, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";

const STORAGE_KEY = "meridian.onboarded.v1";

interface Beat {
  icon: LucideIcon;
  title: string;
  body: string;
}

const BEATS: Beat[] = [
  {
    icon: Compass,
    title: "Two of you, one map",
    body: "Plan every trip together — from the first daydream to the last slow morning. One place for the both of you.",
  },
  {
    icon: Clock,
    title: "Closer, in between",
    body: "A live countdown to your next reunion, and both your clocks side by side — so the distance feels a little smaller.",
  },
  {
    icon: BookHeart,
    title: "Kept forever",
    body: "Every trip quietly becomes a scrapbook: photos, notes, the little moments. Yours to reread for years.",
  },
];

/**
 * First-run welcome — a short, warm three-beat intro to what Meridian is for.
 * Shows once (localStorage), is fully skippable, and never blocks the app on
 * return visits. Respects reduced motion and the standard dialog conventions
 * (Escape to dismiss, focus on the primary action, body scroll lock).
 */
export function Welcome() {
  const reduce = useReducedMotion();
  const [state, setState] = React.useState({ mounted: false, open: false });
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    let show = false;
    try {
      show = !window.localStorage.getItem(STORAGE_KEY);
    } catch {
      show = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ mounted: true, open: show });
  }, []);

  const { mounted, open } = state;

  const finish = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // best-effort — worst case the intro shows again next visit
    }
    setState((s) => ({ ...s, open: false }));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, finish]);

  if (!mounted) return null;

  const last = index === BEATS.length - 1;
  const beat = BEATS[index];
  const Icon = beat.icon;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/35 backdrop-blur-[3px]" aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Meridian"
            className="relative z-10 w-full overflow-hidden rounded-t-xl border border-line bg-surface shadow-lift sm:max-w-md sm:rounded-xl"
            initial={reduce ? { opacity: 0 } : { y: 32, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 20, opacity: 0 }}
            transition={spring}
          >
            <div className="px-7 pt-9 pb-7 text-center">
              <p className="eyebrow">Welcome</p>

              <div aria-live="polite" className="mt-6 min-h-[15rem]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={index}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
                      <Icon size={28} strokeWidth={1.5} />
                    </span>
                    <h2 className="mt-6 text-[1.6rem] leading-tight">{beat.title}</h2>
                    <p className="mx-auto mt-3 max-w-xs text-ink-soft text-balance">
                      {beat.body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="mt-7 flex items-center justify-center gap-2" aria-hidden="true">
                {BEATS.map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === index ? 20 : 6,
                      backgroundColor:
                        i === index ? "var(--color-accent)" : "var(--color-line)",
                    }}
                  />
                ))}
              </div>

              <div className="mt-7 flex items-center justify-between gap-3">
                <Button variant="quiet" size="sm" onClick={finish}>
                  Skip
                </Button>
                <Button
                  autoFocus
                  size="md"
                  onClick={() => (last ? finish() : setIndex((i) => i + 1))}
                  className="min-w-[7.5rem]"
                >
                  {last ? "Begin" : "Next"}
                  <ArrowRight size={17} strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
