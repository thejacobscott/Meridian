import type { getBrowserClient } from "./client";

type SupabaseClient = ReturnType<typeof getBrowserClient>;

/**
 * Find — or create — the `days` row for a (trip, date), returning its id.
 * A null date means "no day" (the Ideas bucket for events, or an undated photo),
 * so we return null without touching the table.
 *
 * The days row is shared between the itinerary (it anchors events via day_id) and
 * Memory (it carries the day's note + rating), so both stores route through here
 * to keep find-or-create identical. `unique (trip_id, date)` makes a concurrent
 * double-create a benign unique violation — we just re-read the winner's id.
 */
export async function ensureDay(
  supabase: SupabaseClient,
  tripId: string,
  date: string | null,
): Promise<string | null> {
  if (date === null) return null;
  const found = await supabase
    .from("days")
    .select("id")
    .eq("trip_id", tripId)
    .eq("date", date)
    .maybeSingle();
  if (found.data) return found.data.id;
  const { data, error } = await supabase
    .from("days")
    .insert({ trip_id: tripId, date })
    .select("id")
    .single();
  if (!error && data) return data.id;
  const again = await supabase
    .from("days")
    .select("id")
    .eq("trip_id", tripId)
    .eq("date", date)
    .maybeSingle();
  return again.data?.id ?? null;
}
