/**
 * Curated trip accents. Each trip carries its own accent that re-themes the app
 * when you enter it (§2). The palette is deliberately warm and editorial — no
 * default Tailwind blue. `deep` is the darker partner used for gradients/ink.
 */
export type Accent = { name: string; color: string; deep: string };

export const ACCENTS: Accent[] = [
  { name: "Clay", color: "#c2664a", deep: "#9e4f38" },
  { name: "Sage", color: "#8a9a7b", deep: "#6c7c5d" },
  { name: "Gold", color: "#b98a3c", deep: "#8f6a2c" },
  { name: "Rose", color: "#c06a7e", deep: "#9d4f62" },
  { name: "Plum", color: "#7c6a9c", deep: "#5f5080" },
  { name: "Sea", color: "#4f8a8b", deep: "#3a6a6b" },
  { name: "Pine", color: "#5a7d63", deep: "#42604a" },
  { name: "Ember", color: "#bb5a3c", deep: "#94462d" },
];

export const DEFAULT_ACCENT = ACCENTS[0];

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, n));
}

/** Darken a hex color toward black by `amount` (0–1). Used as a deep fallback. */
export function darken(hex: string, amount = 0.2): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (c: number) => clampByte(Math.round(c * (1 - amount)));
  return `#${[f(r), f(g), f(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** The deep partner for an accent — looked up if known, else computed. */
export function deepFor(color: string): string {
  const known = ACCENTS.find(
    (a) => a.color.toLowerCase() === color.toLowerCase(),
  );
  return known ? known.deep : darken(color, 0.22);
}
