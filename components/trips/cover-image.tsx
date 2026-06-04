import { cn } from "@/lib/cn";
import { deepFor } from "@/lib/trips/accents";

/** A rich, editorial gradient derived from a trip's accent (used when there's
 *  no photo, and as the backdrop a photo loads over). */
export function coverGradient(accent: string): string {
  const deep = deepFor(accent);
  return `radial-gradient(130% 125% at 14% 6%, color-mix(in oklab, ${accent} 58%, white) 0%, ${accent} 46%, ${deep} 100%)`;
}

/**
 * The cover surface for a trip — its photo if it has one, otherwise its accent
 * gradient. Shared by the trip card and the trip header so the view-transition
 * morph interpolates the same visual.
 */
export function CoverImage({
  src,
  accent,
  alt = "",
  overlay = false,
  className,
}: {
  src?: string | null;
  accent: string;
  alt?: string;
  /** Adds a bottom scrim so overlaid text stays legible. */
  overlay?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("relative isolate overflow-hidden bg-surface-2", className)}
      style={{ background: coverGradient(accent) }}
    >
      {src ? (
        // Plain <img>: covers come from data URLs (preview) and Storage signed
        // URLs (later) — next/image optimization isn't worth the config here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // A soft diagonal sheen gives the bare gradient some depth.
        <div
          aria-hidden
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            background: `linear-gradient(125deg, transparent 38%, color-mix(in oklab, ${accent} 35%, white) 130%)`,
            opacity: 0.5,
          }}
        />
      )}
      {overlay && (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent"
        />
      )}
    </div>
  );
}
