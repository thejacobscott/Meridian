"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — the code stays visible to read aloud.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2 transition-colors hover:border-accent/40"
      aria-label="Copy invite code"
    >
      <span className="font-display text-lg tracking-[0.2em] tabular-nums">
        {code}
      </span>
      <span className="text-ink-soft transition-colors group-hover:text-accent-deep">
        {copied ? (
          <Check size={16} strokeWidth={1.8} />
        ) : (
          <Copy size={16} strokeWidth={1.8} />
        )}
      </span>
    </button>
  );
}
