import type { PackingItem } from "./types";

/**
 * Sample packing list for preview mode (no Supabase keys). Seeded onto the
 * Lisbon sample trip with a mix of owners + a few already ticked off, so the
 * shared checklist shows its full shape out of the box. Replaced once a space
 * connects.
 */
export const SAMPLE_PACKING: PackingItem[] = [
  {
    id: "pack-passports",
    trip_id: "sample-lisbon",
    label: "Passports",
    qty: 2,
    owner: "shared",
    is_packed: true,
    created_at: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "pack-adapter",
    trip_id: "sample-lisbon",
    label: "EU plug adapters",
    qty: 2,
    owner: "shared",
    is_packed: false,
    created_at: "2026-06-01T09:01:00.000Z",
  },
  {
    id: "pack-sunscreen",
    trip_id: "sample-lisbon",
    label: "Sunscreen",
    qty: 1,
    owner: "shared",
    is_packed: false,
    created_at: "2026-06-01T09:02:00.000Z",
  },
  {
    id: "pack-camera",
    trip_id: "sample-lisbon",
    label: "Camera + charger",
    qty: 1,
    owner: "a",
    is_packed: true,
    created_at: "2026-06-01T09:03:00.000Z",
  },
  {
    id: "pack-walkingshoes",
    trip_id: "sample-lisbon",
    label: "Good walking shoes",
    qty: 1,
    owner: "a",
    is_packed: false,
    created_at: "2026-06-01T09:04:00.000Z",
  },
  {
    id: "pack-sundress",
    trip_id: "sample-lisbon",
    label: "The yellow dress",
    qty: 1,
    owner: "b",
    is_packed: false,
    created_at: "2026-06-01T09:05:00.000Z",
  },
  {
    id: "pack-book",
    trip_id: "sample-lisbon",
    label: "A book for the plane",
    qty: 1,
    owner: "b",
    is_packed: false,
    created_at: "2026-06-01T09:06:00.000Z",
  },
];
