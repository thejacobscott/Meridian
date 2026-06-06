// Mapbox seam. The Map tab works fully without a token (an editorial journey
// view); when NEXT_PUBLIC_MAPBOX_TOKEN is present it lights up with a quiet
// static map image behind the places. Mirrors lib/supabase/env.ts.
//
// Next inlines NEXT_PUBLIC_* only when referenced as a literal property access,
// so this must stay `process.env.NEXT_PUBLIC_MAPBOX_TOKEN` — not a dynamic lookup.
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** True once a public Mapbox token is present. */
export const isMapboxConfigured = Boolean(MAPBOX_TOKEN);

export interface StaticMapMarker {
  lat: number;
  lng: number;
  /** Hex without the leading # (Mapbox wants it bare). Defaults to a clay tone. */
  color?: string;
  /** Small label letter/number, e.g. "a" or "1". Omit for a plain pin. */
  label?: string;
}

export interface StaticMapOptions {
  markers?: StaticMapMarker[];
  /** [lng, lat] — omit to let Mapbox auto-fit the markers. */
  center?: [number, number];
  zoom?: number;
  width?: number;
  height?: number;
  /** Muted, editorial style by default — not the loud streets style. */
  styleId?: string;
  retina?: boolean;
}

const clampDim = (n: number) => Math.max(1, Math.min(1280, Math.round(n)));

/**
 * Build a Mapbox Static Images API URL, or null when no token is configured.
 * Pure string building — safe to call anywhere; the caller decides whether to
 * render the resulting <img>.
 */
export function staticMapUrl(opts: StaticMapOptions): string | null {
  if (!MAPBOX_TOKEN) return null;

  const {
    markers = [],
    center,
    zoom = 11,
    width = 640,
    height = 360,
    styleId = "mapbox/light-v11",
    retina = true,
  } = opts;

  const overlay = markers
    .map((m) => {
      const color = (m.color ?? "c2664a").replace(/^#/, "");
      const pin = m.label ? `pin-s-${m.label}` : "pin-s";
      return `${pin}+${color}(${m.lng.toFixed(5)},${m.lat.toFixed(5)})`;
    })
    .join(",");

  const overlaySeg = overlay ? `${overlay}/` : "";
  // Auto-fit when there's an overlay and no explicit center; else use center/zoom.
  const viewport =
    center && !overlay
      ? `${center[0].toFixed(5)},${center[1].toFixed(5)},${zoom}`
      : overlay
        ? "auto"
        : `${(center?.[0] ?? 0).toFixed(5)},${(center?.[1] ?? 0).toFixed(5)},${zoom}`;

  const size = `${clampDim(width)}x${clampDim(height)}${retina ? "@2x" : ""}`;

  return (
    `https://api.mapbox.com/styles/v1/${styleId}/static/` +
    `${overlaySeg}${viewport}/${size}` +
    `?access_token=${MAPBOX_TOKEN}&padding=48&attribution=false&logo=false`
  );
}
