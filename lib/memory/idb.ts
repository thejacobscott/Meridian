import type { StoredPhoto } from "./types";

/**
 * Tiny IndexedDB store for Memory-mode photos in preview mode. localStorage
 * can't hold binary at any real volume, so compressed photo blobs live here;
 * the small per-day notes/ratings stay in localStorage with the rest of the
 * preview state. The future Supabase provider replaces this with Storage +
 * signed URLs behind the same store interface — the UI never touches IDB.
 *
 * Every call is SSR-safe (no-ops / empty when there's no IndexedDB) and
 * swallows failures: preview persistence is best-effort, never fatal.
 */

const DB_NAME = "meridian";
const DB_VERSION = 1;
const STORE = "photos";

function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!hasIDB()) return Promise.reject(new Error("IndexedDB unavailable"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("trip_id", "trip_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Every stored photo (all trips). The store filters by trip in memory. */
export async function idbAllPhotos(): Promise<StoredPhoto[]> {
  if (!hasIDB()) return [];
  try {
    const db = await openDB();
    return await new Promise<StoredPhoto[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as StoredPhoto[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** Insert or replace a photo (used for upload and metadata edits alike). */
export async function idbPutPhoto(photo: StoredPhoto): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(photo);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // best-effort
  }
}

export async function idbDeletePhoto(id: string): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // best-effort
  }
}
