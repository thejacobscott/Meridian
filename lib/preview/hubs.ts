/**
 * Preview "test hubs" — separate localStorage worlds, so you can try the app as
 * different people without mixing data. Preview mode only; real mode is one
 * space per signed-in account.
 *
 * The *default* hub keeps the original, un-prefixed keys, so existing preview
 * data is preserved untouched. Additional hubs namespace every store under
 * `meridian.h.<id>::`. Switching reloads the page so all stores re-hydrate from
 * the active world.
 */
const ACTIVE_KEY = "meridian.hubs.active";
const REGISTRY_KEY = "meridian.hubs.registry";
export const DEFAULT_HUB_ID = "default";
const DEFAULT_HUB: PreviewHub = { id: DEFAULT_HUB_ID, label: "Main hub" };

export interface PreviewHub {
  id: string;
  label: string;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort
  }
}

export function getActiveHubId(): string {
  if (typeof window === "undefined") return DEFAULT_HUB_ID;
  try {
    return window.localStorage.getItem(ACTIVE_KEY) || DEFAULT_HUB_ID;
  } catch {
    return DEFAULT_HUB_ID;
  }
}

/**
 * Storage key for the active hub. The default hub returns the legacy key as-is
 * (existing data stays put); other hubs get a per-hub prefix.
 */
export function previewKey(legacy: string): string {
  const id = getActiveHubId();
  return id === DEFAULT_HUB_ID ? legacy : `meridian.h.${id}::${legacy}`;
}

export function listHubs(): PreviewHub[] {
  if (typeof window === "undefined") return [DEFAULT_HUB];
  const reg = readJSON<PreviewHub[]>(REGISTRY_KEY, []);
  return reg.some((h) => h.id === DEFAULT_HUB_ID) ? reg : [DEFAULT_HUB, ...reg];
}

export function createHub(label: string): PreviewHub {
  const hub: PreviewHub = {
    id: `h${Date.now().toString(36)}`,
    label: label.trim() || "New hub",
  };
  writeJSON(REGISTRY_KEY, [...listHubs(), hub]);
  return hub;
}

export function renameHub(id: string, label: string): void {
  writeJSON(
    REGISTRY_KEY,
    listHubs().map((h) =>
      h.id === id ? { ...h, label: label.trim() || h.label } : h,
    ),
  );
}

/** Switch the active hub and reload, so every store re-hydrates from its world. */
export function switchHub(id: string): void {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // best-effort
  }
  window.location.reload();
}

export function deleteHub(id: string): void {
  if (id === DEFAULT_HUB_ID) return; // the main hub is permanent
  try {
    const prefix = `meridian.h.${id}::`;
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) doomed.push(k);
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // best-effort
  }
  writeJSON(
    REGISTRY_KEY,
    listHubs().filter((h) => h.id !== id),
  );
  if (getActiveHubId() === id) switchHub(DEFAULT_HUB_ID);
}
