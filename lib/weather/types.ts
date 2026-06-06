import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";

/** One day's forecast, normalized from Open-Meteo's daily arrays. */
export interface DailyForecast {
  date: string; // YYYY-MM-DD
  code: number; // WMO weather code
  tempMax: number | null;
  tempMin: number | null;
  precipProb: number | null; // %, 0–100
}

export type WeatherTone = "clear" | "cloud" | "rain" | "snow" | "storm" | "fog";

export interface WeatherInfo {
  label: string;
  icon: LucideIcon;
  tone: WeatherTone;
}

const TONE_COLOR: Record<WeatherTone, string> = {
  clear: "var(--color-gold)",
  cloud: "var(--color-ink-soft)",
  fog: "var(--color-ink-soft)",
  rain: "var(--color-sage)",
  snow: "var(--color-ink-soft)",
  storm: "var(--color-clay)",
};

export function toneColor(tone: WeatherTone): string {
  return TONE_COLOR[tone];
}

/**
 * WMO weather code → a label, a Lucide icon, and an editorial tone. Grouped so
 * the strip reads at a glance rather than enumerating all 28 codes.
 * Reference: open-meteo.com WMO code table.
 */
export function weatherInfo(code: number): WeatherInfo {
  if (code === 0) return { label: "Clear", icon: Sun, tone: "clear" };
  if (code === 1) return { label: "Mostly clear", icon: Sun, tone: "clear" };
  if (code === 2) return { label: "Partly cloudy", icon: CloudSun, tone: "cloud" };
  if (code === 3) return { label: "Overcast", icon: Cloud, tone: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", icon: CloudFog, tone: "fog" };
  if (code >= 51 && code <= 57)
    return { label: "Drizzle", icon: CloudDrizzle, tone: "rain" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: CloudRain, tone: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: CloudSnow, tone: "snow" };
  if (code >= 80 && code <= 82)
    return { label: "Showers", icon: CloudRain, tone: "rain" };
  if (code === 85 || code === 86)
    return { label: "Snow showers", icon: CloudSnow, tone: "snow" };
  if (code >= 95) return { label: "Thunderstorm", icon: CloudLightning, tone: "storm" };
  return { label: "—", icon: Cloud, tone: "cloud" };
}

/** "24°" — rounded, degree only (unit-agnostic for a glanceable strip). */
export function formatTemp(t: number | null): string {
  if (t == null || Number.isNaN(t)) return "—";
  return `${Math.round(t)}°`;
}
