"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAX_RATING } from "@/lib/memory/types";

/**
 * A 1–5 star rating in warm gold. Interactive when `onChange` is given (tapping
 * the current value again clears it); a static read-out otherwise. Used on each
 * day's header in Memory mode.
 */
export function RatingStars({
  value,
  onChange,
  size = 20,
  className,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
  className?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const interactive = !!onChange;
  const shown = hover ?? value ?? 0;

  return (
    <div
      role={interactive ? "radiogroup" : undefined}
      aria-label="How was this day?"
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {Array.from({ length: MAX_RATING }, (_, i) => {
        const n = i + 1;
        const on = n <= shown;
        const icon = (
          <Star
            size={size}
            strokeWidth={1.75}
            className={cn("transition-colors", !on && "text-ink-faint")}
            style={
              on
                ? { color: "var(--color-gold)", fill: "var(--color-gold)" }
                : { fill: "transparent" }
            }
          />
        );

        if (!interactive) {
          return (
            <span key={n} className="leading-none">
              {icon}
            </span>
          );
        }

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange!(value === n ? null : n)}
            onPointerEnter={() => setHover(n)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            className="rounded-full p-0.5 leading-none transition-transform active:scale-90"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
