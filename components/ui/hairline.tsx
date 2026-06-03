import { cn } from "@/lib/cn";

/** A thin editorial divider. */
export function Hairline({ className }: { className?: string }) {
  return (
    <div className={cn("h-px w-full bg-line", className)} aria-hidden="true" />
  );
}
