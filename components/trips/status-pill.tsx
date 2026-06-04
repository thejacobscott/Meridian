import { cn } from "@/lib/cn";
import { STATUS_META, type TripStatus } from "@/lib/trips/types";

const toneClass: Record<string, string> = {
  dreaming: "bg-sage/15 text-[#566348] ring-sage/25",
  upcoming: "bg-accent/12 text-accent-deep ring-accent/25",
  active: "bg-gold/15 text-[#856222] ring-gold/30",
  past: "bg-ink/[0.05] text-ink-soft ring-line",
};

/**
 * The small status marker on cards and headers. `glass` reads on top of a cover
 * photo; `plain` reads on the paper surface.
 */
export function StatusPill({
  status,
  variant = "plain",
  className,
}: {
  status: TripStatus;
  variant?: "plain" | "glass";
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] ring-1 ring-inset whitespace-nowrap",
        variant === "glass"
          ? "bg-surface/80 text-ink ring-white/40 backdrop-blur-md"
          : toneClass[meta.tone],
        className,
      )}
    >
      {status === "active" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
        </span>
      )}
      {meta.label}
    </span>
  );
}
