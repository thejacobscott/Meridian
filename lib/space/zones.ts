import * as React from "react";

/** "America/New_York" → "America/New York" — readable but still unambiguous. */
export function prettyZone(tz: string): string {
  return tz.replace(/_/g, " ");
}

/** Best-guess IANA zone for this device; falls back to UTC. Client-only. */
export function guessDeviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The full IANA list when the engine supports it; a curated fallback if not. */
export function useTimeZones(): string[] {
  return React.useMemo(() => {
    const intl = Intl as { supportedValuesOf?: (key: string) => string[] };
    try {
      const v = intl.supportedValuesOf?.("timeZone");
      if (Array.isArray(v) && v.length > 0) return v;
    } catch {
      // fall through to the curated list
    }
    return [
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Sao_Paulo",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Athens",
      "Africa/Johannesburg",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Bangkok",
      "Asia/Shanghai",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Pacific/Auckland",
      "UTC",
    ];
  }, []);
}
