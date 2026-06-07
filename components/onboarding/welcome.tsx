"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookHeart,
  Clock,
  Compass,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { spring } from "@/lib/motion";
import { useSpace } from "@/lib/space/store";
import { guessDeviceZone, prettyZone, useTimeZones } from "@/lib/space/zones";

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

const selectClass =
  "h-11 w-full appearance-none rounded-lg border border-line bg-surface px-3.5 text-[0.95rem] text-ink shadow-press transition-colors focus:border-accent/60 focus-visible:outline-none";

/**
 * First-run welcome — a short, warm three-beat intro to what Meridian is for,
 * followed by a single personalization step (two names + two clocks) so the app
 * is "the two of you" from the very first screen instead of "You / Your person".
 * Shows once (localStorage), is fully skippable, and never blocks the app on
 * return visits. Respects reduced motion and the standard dialog conventions
 * (Escape to dismiss, focus on the primary action, body scroll lock).
 */
export function Welcome() {
  const reduce = useReducedMotion();
  const { updateMember } = useSpace();
  const zones = useTimeZones();
  const [state, setState] = React.useState({ mounted: false, open: false });
  const [index, setIndex] = React.useState(0);

  // Personalization draft — committed to the space store only on "Begin", so a
  // Skip (or Escape) leaves the saved values untouched. The device zone is a
  // sensible default for you; your person's defaults to a real offset to show
  // the dual clocks off out of the box.
  const [nameA, setNameA] = React.useState("");
  const [cityA, setCityA] = React.useState("");
  const [tzA, setTzA] = React.useState<string>(() => guessDeviceZone());
  const [nameB, setNameB] = React.useState("");
  const [cityB, setCityB] = React.useState("");
  const [tzB, setTzB] = React.useState<string>("Europe/London");

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

  // Save the two identities, then dismiss. Empty fields fall back to the same
  // gentle placeholders the rest of the app uses, so nothing reads as blank.
  const begin = React.useCallback(() => {
    void updateMember("a", {
      name: nameA.trim() || "You",
      city: cityA.trim() || null,
      tz: tzA,
    });
    void updateMember("b", {
      name: nameB.trim() || "Your person",
      city: cityB.trim() || null,
      tz: tzB,
    });
    finish();
  }, [updateMember, nameA, cityA, tzA, nameB, cityB, tzB, finish]);

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

  const total = BEATS.length + 1;
  const onPersonalize = index === BEATS.length;
  const beat = onPersonalize ? null : BEATS[index];
  const Icon = beat?.icon ?? Users;
  const optionsA = zones.includes(tzA) ? zones : [tzA, ...zones];
  const optionsB = zones.includes(tzB) ? zones : [tzB, ...zones];

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
              <p className="eyebrow">{onPersonalize ? "Last thing" : "Welcome"}</p>

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

                    {beat ? (
                      <>
                        <h2 className="mt-6 text-[1.6rem] leading-tight">{beat.title}</h2>
                        <p className="mx-auto mt-3 max-w-xs text-ink-soft text-balance">
                          {beat.body}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="mt-6 text-[1.6rem] leading-tight">
                          Make it the two of you
                        </h2>
                        <p className="mx-auto mt-3 max-w-xs text-ink-soft text-balance">
                          Two names and two clocks — so it&apos;s yours from the
                          very first screen. You can change any of it later.
                        </p>

                        <div className="mt-6 space-y-5 text-left">
                          <div className="space-y-2">
                            <p className="eyebrow">You</p>
                            <Input
                              autoFocus
                              value={nameA}
                              onChange={(e) => setNameA(e.target.value)}
                              placeholder="Your name"
                              aria-label="Your name"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={cityA}
                                onChange={(e) => setCityA(e.target.value)}
                                placeholder="Home city"
                                aria-label="Your home city"
                              />
                              <select
                                value={tzA}
                                onChange={(e) => setTzA(e.target.value)}
                                aria-label="Your time zone"
                                className={selectClass}
                              >
                                {optionsA.map((tz) => (
                                  <option key={tz} value={tz}>
                                    {prettyZone(tz)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="eyebrow">Your person</p>
                            <Input
                              value={nameB}
                              onChange={(e) => setNameB(e.target.value)}
                              placeholder="Their name"
                              aria-label="Their name"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={cityB}
                                onChange={(e) => setCityB(e.target.value)}
                                placeholder="Home city"
                                aria-label="Their home city"
                              />
                              <select
                                value={tzB}
                                onChange={(e) => setTzB(e.target.value)}
                                aria-label="Their time zone"
                                className={selectClass}
                              >
                                {optionsB.map((tz) => (
                                  <option key={tz} value={tz}>
                                    {prettyZone(tz)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="mt-7 flex items-center justify-center gap-2" aria-hidden="true">
                {Array.from({ length: total }).map((_, i) => (
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
                  autoFocus={!onPersonalize}
                  size="md"
                  onClick={() => (onPersonalize ? begin() : setIndex((i) => i + 1))}
                  className="min-w-[7.5rem]"
                >
                  {onPersonalize ? "Begin" : "Next"}
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
