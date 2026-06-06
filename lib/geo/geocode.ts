// Keyless place → coordinates, via Open-Meteo's geocoding API (CORS-enabled,
// no token). Powers the Map tab's center and the weather strip. Seeded for the
// sample destinations so preview mode resolves instantly and offline; live
// lookups are cached in localStorage so we never hit the network twice for the
// same place.

export interface GeoPlace {
  name: string;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

/** Sample destinations resolve instantly, no network. Keyed by lowercased name. */
const SEED: Record<string, GeoPlace> = {
  "lisbon, portugal": {
    name: "Lisbon",
    country: "Portugal",
    latitude: 38.7223,
    longitude: -9.1393,
    timezone: "Europe/Lisbon",
  },
  "kyoto, japan": {
    name: "Kyoto",
    country: "Japan",
    latitude: 35.0116,
    longitude: 135.7681,
    timezone: "Asia/Tokyo",
  },
  "amalfi coast, italy": {
    name: "Amalfi Coast",
    country: "Italy",
    latitude: 40.634,
    longitude: 14.6027,
    timezone: "Europe/Rome",
  },
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Synchronous seed lookup for instant render. Matches full string, then city. */
export function seededPlace(query: string): GeoPlace | null {
  if (!query) return null;
  const norm = normalize(query);
  if (SEED[norm]) return SEED[norm];
  const city = norm.split(",")[0].trim();
  if (!city) return null;
  for (const [key, place] of Object.entries(SEED)) {
    if (key.startsWith(city)) return place;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cache (in-memory + localStorage), keyed by normalized query.
// ---------------------------------------------------------------------------
const CACHE_KEY = "meridian.geo.v1";
const mem = new Map<string, GeoPlace | null>();
let loaded = false;

function loadCache() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, GeoPlace>;
    for (const [k, v] of Object.entries(parsed)) mem.set(k, v);
  } catch {
    // best-effort
  }
}

function persistCache() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, GeoPlace> = {};
    for (const [k, v] of mem) if (v) obj[k] = v;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // best-effort
  }
}

/**
 * Resolve a place to coordinates. Seed first (instant), then cache, then a live
 * keyless lookup. Returns null on miss or any network failure — every caller
 * degrades gracefully rather than throwing.
 */
export async function geocode(query: string): Promise<GeoPlace | null> {
  if (!query || !query.trim()) return null;
  const seed = seededPlace(query);
  if (seed) return seed;

  loadCache();
  const norm = normalize(query);
  if (mem.has(norm)) return mem.get(norm) ?? null;

  try {
    const name = encodeURIComponent(norm.split(",")[0].trim());
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${name}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const data = (await res.json()) as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
        timezone?: string;
      }>;
    };
    const r = data.results?.[0];
    const place: GeoPlace | null = r
      ? {
          name: r.name,
          country: r.country ?? null,
          latitude: r.latitude,
          longitude: r.longitude,
          timezone: r.timezone ?? null,
        }
      : null;
    mem.set(norm, place);
    persistCache();
    return place;
  } catch {
    mem.set(norm, null); // negative cache for this session only (not persisted)
    return null;
  }
}
