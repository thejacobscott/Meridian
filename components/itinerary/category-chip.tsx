import { cn } from "@/lib/cn";
import type { Category } from "@/lib/itinerary/categories";

/**
 * The small colored category marker used on event cards and in the picker. Tints
 * itself from the category's own color (icon + label inherit a deepened shade),
 * so the timeline gets its glanceable rhythm without any per-category CSS.
 */
export function CategoryChip({
  category,
  className,
}: {
  category: Category | null;
  className?: string;
}) {
  if (!category) return null;
  const Icon = category.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium whitespace-nowrap",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${category.color} 13%, transparent)`,
        color: `color-mix(in oklab, ${category.color} 68%, var(--color-ink))`,
      }}
    >
      <Icon size={12} strokeWidth={2} />
      {category.name}
    </span>
  );
}

/** Just the colored dot — for dense rows where the chip would be too much. */
export function CategoryDot({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
