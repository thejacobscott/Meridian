import type { ItineraryEvent } from "./types";

/**
 * Sample itinerary for the Lisbon sample trip (lib/trips/sample.ts), so the
 * timeline has an immediate, lived-in first impression in preview mode: a couple
 * of planned days, an idea day, and two unscheduled daydreams in the Ideas
 * bucket. Real events replace these once a space is connected. Dates line up
 * with sample-lisbon's window (2026-06-21 → 28).
 */
let seq = 0;
function ev(
  p: Partial<ItineraryEvent> &
    Pick<ItineraryEvent, "id" | "date" | "title" | "category_id" | "status" | "sort_order">,
): ItineraryEvent {
  seq += 1;
  return {
    trip_id: "sample-lisbon",
    start_time: null,
    end_time: null,
    location_name: null,
    notes: null,
    cost: null,
    currency: "EUR",
    booking_ref: null,
    created_at: `2026-03-03T10:${seq.toString().padStart(2, "0")}:00.000Z`,
    ...p,
  };
}

export const SAMPLE_EVENTS: ItineraryEvent[] = [
  // Day 1 — Sat 21 Jun
  ev({
    id: "ev-lis-arrive",
    date: "2026-06-21",
    sort_order: 0,
    title: "Land & drop the bags in Alfama",
    category_id: "cat-travel",
    status: "booked",
    start_time: "14:30",
    end_time: "15:30",
    location_name: "Alfama guesthouse",
    booking_ref: "TP 1187",
    cost: 420,
  }),
  ev({
    id: "ev-lis-timeout",
    date: "2026-06-21",
    sort_order: 1,
    title: "Dinner at the Time Out Market",
    category_id: "cat-food",
    status: "planned",
    start_time: "19:30",
    location_name: "Mercado da Ribeira",
    cost: 48,
  }),
  ev({
    id: "ev-lis-sunset",
    date: "2026-06-21",
    sort_order: 2,
    title: "Sunset at Miradouro de Santa Catarina",
    category_id: "cat-relax",
    status: "idea",
    start_time: "21:15",
    location_name: "Santa Catarina",
    notes: "Bring a bottle of vinho verde.",
  }),

  // Day 2 — Sun 22 Jun
  ev({
    id: "ev-lis-pasteis",
    date: "2026-06-22",
    sort_order: 0,
    title: "Pastéis de Belém, still warm",
    category_id: "cat-food",
    status: "booked",
    start_time: "09:30",
    end_time: "10:30",
    location_name: "Belém",
  }),
  ev({
    id: "ev-lis-jeronimos",
    date: "2026-06-22",
    sort_order: 1,
    title: "Jerónimos Monastery",
    category_id: "cat-culture",
    status: "planned",
    start_time: "11:00",
    end_time: "12:30",
    location_name: "Belém",
    cost: 12,
  }),
  ev({
    id: "ev-lis-fado",
    date: "2026-06-22",
    sort_order: 2,
    title: "Fado night, the two of us",
    category_id: "cat-nightlife",
    status: "booked",
    start_time: "20:00",
    location_name: "Tasca do Chico",
    booking_ref: "Table for 2",
    cost: 35,
  }),

  // Day 3 — Mon 23 Jun (looser, mostly ideas)
  ev({
    id: "ev-lis-tram",
    date: "2026-06-23",
    sort_order: 0,
    title: "Ride Tram 28 end to end",
    category_id: "cat-sightseeing",
    status: "idea",
  }),
  ev({
    id: "ev-lis-principe",
    date: "2026-06-23",
    sort_order: 1,
    title: "Slow lunch in Príncipe Real",
    category_id: "cat-food",
    status: "idea",
    start_time: "13:00",
  }),

  // Unscheduled — the Ideas bucket
  ev({
    id: "ev-lis-sintra",
    date: null,
    sort_order: 0,
    title: "Day trip to Sintra",
    category_id: "cat-adventure",
    status: "idea",
    notes: "Pena Palace + Quinta da Regaleira. Book the early train.",
    cost: 90,
  }),
  ev({
    id: "ev-lis-lxfactory",
    date: null,
    sort_order: 1,
    title: "Wander LX Factory",
    category_id: "cat-shopping",
    status: "idea",
  }),
];
