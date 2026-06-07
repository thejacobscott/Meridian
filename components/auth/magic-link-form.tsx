"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { fadeUp, spring } from "@/lib/motion";

type Status = "idle" | "sending" | "sent";

export function MagicLinkForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(
    initialError === "link_expired"
      ? "That link has expired. Here's a fresh one."
      : initialError
        ? "Something interrupted that sign-in. Here's a fresh link."
        : null,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;

    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="text-center"
      >
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent-deep">
          <MailCheck size={22} strokeWidth={1.6} />
        </span>
        <h2 className="text-xl tracking-[-0.01em]">Check your email</h2>
        <p className="mx-auto mt-2 max-w-[19rem] text-pretty text-sm leading-relaxed text-ink-soft">
          We sent a sign-in link to{" "}
          <span className="text-ink">{email.trim()}</span>. Open it on this
          device to step inside.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-ink"
        >
          Use a different email
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form
      variants={fadeUp}
      initial="initial"
      animate="animate"
      onSubmit={onSubmit}
      className="space-y-3"
    >
      <Input
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
        className="h-12 text-center"
      />
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send me a link"}
        {status !== "sending" && <ArrowRight size={17} strokeWidth={1.8} />}
      </Button>
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: spring }}
          className="pt-1 text-center text-sm text-clay-deep"
        >
          {error}
        </motion.p>
      )}
    </motion.form>
  );
}
