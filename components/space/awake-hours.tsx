"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/space/clock";

/**
 * Two native time inputs bound to a member's waking window (minutes from local
 * midnight). Commits on change, like the time-zone select. Shared by the space
 * editor (preview — both people) and the profile (real mode — your own row).
 */
export function AwakeHoursField({
  wakeStart,
  wakeEnd,
  onChange,
  className,
}: {
  wakeStart: number;
  wakeEnd: number;
  onChange: (patch: { wakeStart?: number; wakeEnd?: number }) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <Field label="Awake from">
        <TimeInput
          value={wakeStart}
          icon={<Sun size={14} strokeWidth={1.6} />}
          aria-label="Awake from"
          onChange={(v) => onChange({ wakeStart: v })}
        />
      </Field>
      <Field label="Until">
        <TimeInput
          value={wakeEnd}
          icon={<Moon size={14} strokeWidth={1.6} />}
          aria-label="Awake until"
          onChange={(v) => onChange({ wakeEnd: v })}
        />
      </Field>
    </div>
  );
}

function TimeInput({
  value,
  icon,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: number;
  icon: React.ReactNode;
  onChange: (minutes: number) => void;
  "aria-label": string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
        {icon}
      </span>
      <input
        type="time"
        value={minutesToHHMM(value)}
        aria-label={ariaLabel}
        onChange={(e) => {
          const v = hhmmToMinutes(e.target.value);
          if (v !== null) onChange(v);
        }}
        className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[0.95rem] tabular-nums text-ink shadow-press transition-colors focus:border-accent/60 focus-visible:outline-none"
      />
    </div>
  );
}
