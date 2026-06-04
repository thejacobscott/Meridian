import {
  Camera,
  Flower2,
  Heart,
  Landmark,
  Mountain,
  Plane,
  ShoppingBag,
  Trees,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * A planning category. Each event can carry one; the chip's color + icon give
 * the day-by-day timeline its glanceable rhythm (and feeds the Balance tracker
 * in Sprint 3).
 */
export interface Category {
  id: string;
  name: string;
  color: string;
  /** Stored name (matches the DB seed) so the live backend can map by it. */
  iconName: string;
  icon: LucideIcon;
}

/**
 * The default category set. Mirrors the global rows seeded in
 * supabase/migrations/0001_init.sql exactly (name, color, icon) so the preview
 * palette is identical to the live one. In preview mode the IDs are stable
 * slugs; once Supabase is connected, events reference the DB's UUIDs instead —
 * either way an event just stores a `category_id`.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-food", name: "Food", color: "#C2664A", iconName: "utensils", icon: Utensils },
  { id: "cat-nightlife", name: "Bars & Nightlife", color: "#7C5CBF", iconName: "wine", icon: Wine },
  { id: "cat-culture", name: "Culture", color: "#B98A3C", iconName: "landmark", icon: Landmark },
  { id: "cat-outdoors", name: "Outdoors", color: "#6E8B5B", iconName: "trees", icon: Trees },
  { id: "cat-sightseeing", name: "Sightseeing", color: "#4A8FB0", iconName: "camera", icon: Camera },
  { id: "cat-shopping", name: "Shopping", color: "#C77FA6", iconName: "shopping-bag", icon: ShoppingBag },
  { id: "cat-relax", name: "Relax", color: "#8A9A7B", iconName: "flower", icon: Flower2 },
  { id: "cat-romance", name: "Romance", color: "#C85C7E", iconName: "heart", icon: Heart },
  { id: "cat-adventure", name: "Adventure", color: "#D08B2C", iconName: "mountain", icon: Mountain },
  { id: "cat-travel", name: "Travel", color: "#6B655C", iconName: "plane", icon: Plane },
];

const BY_ID = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

/** Resolve a stored category_id to its full record (color/icon/name). */
export function categoryById(id: string | null | undefined): Category | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}
