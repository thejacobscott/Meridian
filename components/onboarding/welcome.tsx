"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { easeSoft, spring } from "@/lib/motion";
import { useSpace } from "@/lib/space/store";
import { guessDeviceZone, prettyZone, useTimeZones } from "@/lib/space/zones";

// Bumped to v2 with the new greeting, so anyone who saw the old three-beat
// intro gets to meet the new one once.
const STORAGE_KEY = "meridian.onboarded.v2";
// The first little note is kept locally for now; the connection hub (the synced
// notes home) will adopt this seam later.
const NOTE_KEY = "meridian.welcome.note.v1";

type Scene = "greeting" | "note" | "personalize";
const ORDER: Scene[] = ["greeting", "note", "personalize"];

const selectClass =
  "h-11 w-full appearance-none rounded-lg border border-line bg-surface px-3.5 text-[0.95rem] text-ink shadow-press transition-colors focus:border-accent/60 focus-visible:outline-none";

/**
 * First-run welcome — the screen she opens to. It leads with a small cinematic
 * moment ("two dots meet": the home-screen you/your-person motif, blooming
 * together) and the line she should feel — *someone far away misses you, and
 * can't wait to see you next.* Then a tender first note, and finally the quiet,
 * skippable personalization (two names + two clocks) so the app is "the two of
 * you" from the very first screen.
 *
 * Shows once (localStorage), is fully skippable, never blocks the app on return
 * visits, respects reduced motion, and follows the dialog conventions (Escape
 * to dismiss, body scroll lock, focus on the primary action).
 */
export function Welcome() {
  const reduce = useReducedMotion();
  const { updateMember } = useSpace();
  const zones = useTimeZones();
  const [state, setState] = React.useState({ mounted: false, open: false });
  const [scene, setScene] = React.useState<Scene>("greeting");
  const [greetingReady, setGreetingReady] = React.useState(false);

  // A first note for each other — loaded back if it already exists, kept on the
  // way forward. Tucked in localStorage until the connection hub syncs it.
  const [note, setNote] = React.useState("");

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
    let saved = "";
    try {
      show = !window.localStorage.getItem(STORAGE_KEY);
      saved = window.localStorage.getItem(NOTE_KEY) ?? "";
    } catch {
      show = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ mounted: true, open: show });
    if (saved) setNote(saved);
  }, []);

  const { mounted, open } = state;

  // Let the greeting play before its Continue appears; reduced motion skips the
  // wait entirely.
  React.useEffect(() => {
    if (!open || scene !== "greeting") return;
    const t = setTimeout(() => setGreetingReady(true), reduce ? 0 : 3300);
    return () => clearTimeout(t);
  }, [open, scene, reduce]);

  const finish = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // best-effort — worst case the intro shows again next visit
    }
    setState((s) => ({ ...s, open: false }));
  }, []);

  const saveNote = React.useCallback(() => {
    try {
      const v = note.trim();
      if (v) window.localStorage.setItem(NOTE_KEY, v);
    } catch {
      // best-effort — the note is a keepsake, not load-bearing
    }
  }, [note]);

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
            <div className="px-7 pt-8 pb-7 text-center">
              {scene !== "greeting" && (
                <p className="eyebrow">
                  {scene === "note" ? "A first note" : "Last thing"}
                </p>
              )}

              <div className="min-h-[17rem]">
                <AnimatePresence mode="wait">
                  {scene === "greeting" && (
                    <motion.div
                      key="greeting"
                      initial={reduce ? { opacity: 0 } : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                      transition={{ duration: 0.3, ease: easeSoft }}
                    >
                      <TwoDotsStage reduce={!!reduce} />
                      <div
                        aria-live="polite"
                        className="mx-auto mt-8 min-h-[4.5rem] max-w-xs space-y-1"
                      >
                        <motion.p
                          className="font-display text-[1.4rem] leading-snug text-ink text-balance"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reduce ? 0 : 0.4, duration: 0.7, ease: easeSoft }}
                        >
                          Someone far away misses you&hellip;
                        </motion.p>
                        <motion.p
                          className="font-display text-[1.4rem] leading-snug text-ink-soft text-balance"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reduce ? 0 : 2.0, duration: 0.7, ease: easeSoft }}
                        >
                          &hellip;and can&rsquo;t wait to see you next.
                        </motion.p>
                      </div>
                    </motion.div>
                  )}

                  {scene === "note" && (
                    <motion.div
                      key="note"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                      transition={{ duration: 0.28, ease: easeSoft }}
                      className="pt-2"
                    >
                      <h2 className="text-[1.6rem] leading-tight">Leave them a note</h2>
                      <p className="mx-auto mt-3 max-w-xs text-ink-soft text-balance">
                        A first little something for the two of you. Say what you
                        miss, or where you want to wake up next.
                      </p>
                      <div className="mt-6 text-left">
                        <Textarea
                          autoFocus
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Write something only they'll read…"
                          aria-label="A note for your person"
                          rows={4}
                          maxLength={500}
                          className="min-h-[7rem] text-[1rem] leading-relaxed"
                        />
                      </div>
                    </motion.div>
                  )}

                  {scene === "personalize" && (
                    <motion.div
                      key="personalize"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                      transition={{ duration: 0.28, ease: easeSoft }}
                      className="pt-2"
                    >
                      <h2 className="text-[1.6rem] leading-tight">
                        Make it the two of you
                      </h2>
                      <p className="mx-auto mt-3 max-w-xs text-ink-soft text-balance">
                        Two names and two clocks — so it&rsquo;s yours from the
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Progress dots — hidden during the cinematic greeting. */}
              {scene !== "greeting" && (
                <div
                  className="mt-7 flex items-center justify-center gap-2"
                  aria-hidden="true"
                >
                  {ORDER.map((s) => (
                    <span
                      key={s}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: s === scene ? 20 : 6,
                        backgroundColor:
                          s === scene ? "var(--color-accent)" : "var(--color-line)",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Footer — one cinematic Continue for the greeting, Skip + advance
                  for the practical scenes. */}
              {scene === "greeting" ? (
                <div className="mt-8 flex min-h-[2.75rem] justify-center">
                  <AnimatePresence>
                    {greetingReady && (
                      <motion.div
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: easeSoft }}
                      >
                        <Button
                          autoFocus
                          size="md"
                          onClick={() => setScene("note")}
                          className="min-w-[8rem]"
                        >
                          Come in
                          <ArrowRight size={17} strokeWidth={1.75} />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="mt-7 flex items-center justify-between gap-3">
                  <Button variant="quiet" size="sm" onClick={finish}>
                    Skip
                  </Button>
                  {scene === "note" ? (
                    <Button
                      size="md"
                      onClick={() => {
                        saveNote();
                        setScene("personalize");
                      }}
                      className="min-w-[7.5rem]"
                    >
                      Next
                      <ArrowRight size={17} strokeWidth={1.75} />
                    </Button>
                  ) : (
                    <Button size="md" onClick={begin} className="min-w-[7.5rem]">
                      Begin
                      <ArrowRight size={17} strokeWidth={1.75} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * The "two dots meet" motif — a cinematic cousin of the home-screen reunion
 * connector. You (clay) and your person (sage) start far apart on a dashed
 * meridian, drift together, and a soft warmth blooms where you meet. Reduced
 * motion shows you already together.
 */
function TwoDotsStage({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative mx-auto mt-2 flex h-28 w-full max-w-[260px] items-center justify-center">
      {/* the meridian they're both on */}
      <motion.div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-line"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: easeSoft }}
      />

      {/* warmth blooming at the meeting point */}
      <motion.span
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full"
        style={{
          marginLeft: -24,
          marginTop: -24,
          background:
            "radial-gradient(circle, var(--color-clay) 0%, transparent 70%)",
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={
          reduce
            ? { scale: 1, opacity: 0.32 }
            : { scale: [0.3, 1, 2.4], opacity: [0, 0.5, 0] }
        }
        transition={{ delay: reduce ? 0 : 2.0, duration: reduce ? 0.4 : 1.7, ease: easeSoft }}
      />

      {/* you */}
      <Dot side="you" reduce={reduce} color="var(--color-clay)" halo="rgba(194,102,74,0.18)" />
      {/* your person */}
      <Dot side="partner" reduce={reduce} color="var(--color-sage)" halo="rgba(138,154,123,0.20)" />

      {/* the heart that closes the distance */}
      <motion.span
        className="absolute left-1/2 top-1/2"
        style={{ marginLeft: -8, marginTop: -8 }}
        initial={{ opacity: 0, scale: 0.4, y: 0 }}
        animate={{ opacity: 1, scale: 1, y: reduce ? 0 : -22 }}
        transition={{ delay: reduce ? 0 : 2.3, ...spring }}
      >
        <Heart
          size={16}
          strokeWidth={1.75}
          className="text-clay"
          style={{ fill: "var(--color-clay)" }}
        />
      </motion.span>
    </div>
  );
}

function Dot({
  side,
  reduce,
  color,
  halo,
}: {
  side: "you" | "partner";
  reduce: boolean;
  color: string;
  halo: string;
}) {
  const fromX = side === "you" ? -104 : 104;
  const toX = side === "you" ? -8 : 8;
  return (
    <motion.span
      className="absolute left-1/2 top-1/2 block h-3.5 w-3.5 rounded-full"
      style={{ marginLeft: -7, marginTop: -7, backgroundColor: color, boxShadow: `0 0 0 4px ${halo}` }}
      initial={reduce ? { x: toX } : { x: fromX }}
      animate={{ x: toX, scale: reduce ? 1 : [1, 1.12, 1] }}
      transition={{
        x: { delay: 0.5, duration: reduce ? 0 : 1.8, ease: easeSoft },
        scale: reduce
          ? { duration: 0 }
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
      }}
    />
  );
}
