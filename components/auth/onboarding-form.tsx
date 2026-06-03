"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { fadeUp, spring } from "@/lib/motion";

type Mode = "create" | "join";

export function OnboardingForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");

  const [spaceName, setSpaceName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [tz, setTz] = useState("");
  const [tzOptions, setTzOptions] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fill timezone from the browser after mount so SSR and client markup match.
  useEffect(() => {
    let zone = "";
    let zones: string[] = [];
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      const supported = (
        Intl as typeof Intl & {
          supportedValuesOf?: (k: string) => string[];
        }
      ).supportedValuesOf;
      if (supported) zones = supported("timeZone");
    } catch {
      // Older runtime — the plain text field still works.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTz(zone);
    setTzOptions(zones);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    if (mode === "create") {
      const { data, error } = await supabase.rpc("create_space", {
        p_name: spaceName,
        p_display_name: displayName,
        p_home_city: homeCity,
        p_home_tz: tz,
      });
      if (error || !data) {
        setError(error?.message ?? "Couldn't create your space.");
        setSubmitting(false);
        return;
      }
      const { data: space } = await supabase
        .from("spaces")
        .select("invite_code")
        .eq("id", data)
        .single();
      setCreatedCode(space?.invite_code ?? "");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.rpc("join_space", {
      p_invite_code: inviteInput,
      p_display_name: displayName,
      p_home_city: homeCity,
      p_home_tz: tz,
    });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function copyCode() {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — the code is still on screen to read aloud.
    }
  }

  function enterApp() {
    router.replace("/");
    router.refresh();
  }

  if (createdCode !== null) {
    return (
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="text-center"
      >
        <p className="eyebrow">Your space is ready</p>
        <h2 className="mt-3 text-2xl tracking-[-0.015em]">
          Now bring them in
        </h2>
        <p className="mx-auto mt-3 max-w-[20rem] text-pretty text-sm leading-relaxed text-ink-soft">
          Share this code with your person. They choose “I have a code” to join
          you here.
        </p>

        <button
          type="button"
          onClick={copyCode}
          className="group mx-auto mt-7 flex items-center gap-3 rounded-xl border border-line bg-surface px-6 py-4 shadow-soft transition-colors hover:border-accent/40"
        >
          <span className="font-display text-2xl tracking-[0.22em] tabular-nums">
            {createdCode}
          </span>
          <span className="text-ink-soft transition-colors group-hover:text-accent-deep">
            {copied ? (
              <Check size={18} strokeWidth={1.8} />
            ) : (
              <Copy size={18} strokeWidth={1.8} />
            )}
          </span>
        </button>
        <p className="mt-2 h-4 text-xs text-ink-soft">
          {copied ? "Copied" : "Tap to copy"}
        </p>

        <Button size="lg" className="mt-7 w-full" onClick={enterApp}>
          Enter Meridian
          <ArrowRight size={17} strokeWidth={1.8} />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="flex justify-center">
        <SegmentedControl
          items={[
            { value: "create", label: "Start fresh" },
            { value: "join", label: "I have a code" },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v as Mode);
            setError(null);
          }}
        />
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 text-left">
        {mode === "create" ? (
          <Field label="What should we call you two?" htmlFor="space-name">
            <Input
              id="space-name"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder="Us"
              autoComplete="off"
            />
          </Field>
        ) : (
          <Field label="Invite code" htmlFor="invite-code">
            <Input
              id="invite-code"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
              placeholder="8 characters"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="tracking-[0.18em] tabular-nums"
              required
            />
          </Field>
        )}

        <Field label="Your name" htmlFor="display-name">
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What they call you"
            autoComplete="given-name"
            required
          />
        </Field>

        <Field label="Home city" htmlFor="home-city">
          <Input
            id="home-city"
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
            placeholder="Where you wake up"
            autoComplete="off"
          />
        </Field>

        <Field
          label="Home time zone"
          htmlFor="home-tz"
          hint="So we can always show both your clocks."
        >
          <Input
            id="home-tz"
            list="tz-options"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            placeholder="Europe/Paris"
            autoComplete="off"
          />
          <datalist id="tz-options">
            {tzOptions.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </Field>

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={submitting}
        >
          {submitting
            ? "One moment…"
            : mode === "create"
              ? "Create our space"
              : "Join them"}
          {!submitting && <ArrowRight size={17} strokeWidth={1.8} />}
        </Button>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: spring }}
            className="text-center text-sm text-clay-deep"
          >
            {error}
          </motion.p>
        )}
      </form>
    </motion.div>
  );
}
