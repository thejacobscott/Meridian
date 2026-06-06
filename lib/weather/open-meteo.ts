import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { toISODate } from "@/lib/itinerary/types";
import type { DailyForecast } from "./types";

/** Open-Meteo's free forecast reaches ~16 days out. */
export const FORECAST_HORIZON_DAYS = 15;

export interface ForecastWindow {
  start: string;
  end: string;
}

function parse(d: string | null): Date | null {
  if (!d) return null;
  const p = parseISO(d);
  return Number.isNaN(p.getTime()) ? null : p;
}

/**
 * The slice of a trip's dates that the live forecast can actually cover: the
 * overlap of [start, end] with [today, today + horizon]. Null when the trip has
 * no dates, is wholly in the past, or starts beyond the horizon.
 */
export function forecastWindow(
  start: string | null,
  end: string | null,
  now: Date = new Date(),
): ForecastWindow | null {
  const s = parse(start);
  if (!s) return null;
  const e = parse(end) ?? s;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = addDays(today, FORECAST_HORIZON_DAYS);

  const winStart = s < today ? today : s;
  const winEnd = e > horizon ? horizon : e;
  if (differenceInCalendarDays(winEnd, winStart) < 0) return null;
  return { start: toISODate(winStart), end: toISODate(winEnd) };
}

/**
 * Fetch a daily forecast for a coordinate + date range from Open-Meteo (keyless,
 * CORS-enabled). Returns [] on any failure so callers degrade gracefully.
 */
export async function fetchForecast(
  lat: number,
  lng: number,
  start: string,
  end: string,
): Promise<DailyForecast[]> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      start_date: start,
      end_date: end,
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`forecast ${res.status}`);
    const data = (await res.json()) as {
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: (number | null)[];
      };
    };
    const time = data.daily?.time ?? [];
    return time.map((date, i) => ({
      date,
      code: data.daily?.weather_code?.[i] ?? 0,
      tempMax: data.daily?.temperature_2m_max?.[i] ?? null,
      tempMin: data.daily?.temperature_2m_min?.[i] ?? null,
      precipProb: data.daily?.precipitation_probability_max?.[i] ?? null,
    }));
  } catch {
    return [];
  }
}
