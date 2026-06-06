import type { DailyForecast } from "./types";

/**
 * Seeded forecast for the Lisbon sample trip (2026-06-21 → 28), so the weather
 * strip looks alive in preview mode regardless of the live forecast horizon.
 * A run of clear late-June days with one partly-cloudy break — editorial demo
 * data, replaced by the real Open-Meteo forecast once a trip is in range.
 */
export const SAMPLE_WEATHER: DailyForecast[] = [
  { date: "2026-06-21", code: 0, tempMax: 28, tempMin: 18, precipProb: 0 },
  { date: "2026-06-22", code: 1, tempMax: 29, tempMin: 18, precipProb: 5 },
  { date: "2026-06-23", code: 2, tempMax: 27, tempMin: 17, precipProb: 10 },
  { date: "2026-06-24", code: 0, tempMax: 30, tempMin: 19, precipProb: 0 },
  { date: "2026-06-25", code: 0, tempMax: 31, tempMin: 20, precipProb: 0 },
  { date: "2026-06-26", code: 3, tempMax: 26, tempMin: 18, precipProb: 25 },
  { date: "2026-06-27", code: 1, tempMax: 28, tempMin: 18, precipProb: 5 },
  { date: "2026-06-28", code: 0, tempMax: 29, tempMin: 19, precipProb: 0 },
];
