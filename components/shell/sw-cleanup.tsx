"use client";

import * as React from "react";

const RELOAD_FLAG = "meridian:sw-cleanup-reloaded";

/**
 * Meridian ships no service worker of its own. But service workers are scoped to
 * an *origin* (host:port), so a different app previously run on this same
 * localhost port can leave one registered — and it will quietly hijack
 * navigation here, making the page look like it "turned into" that other app.
 *
 * Because we never register a worker, any worker found at our origin is foreign
 * and stale. This guard removes all of them (and the caches they may have left),
 * and if one was actively controlling *this* load, reloads once to come back
 * clean from the network. The `wasControlled` check plus the session flag make a
 * reload loop impossible: after unregistering there is no controller, so the
 * next load finds nothing to do.
 *
 * If Meridian ever adds a real PWA/service worker, delete this component.
 */
export function ServiceWorkerCleanup() {
  React.useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void (async () => {
      try {
        const registrations =
          await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) return;

        const wasControlled = Boolean(navigator.serviceWorker.controller);
        await Promise.all(registrations.map((r) => r.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }

        const alreadyReloaded =
          sessionStorage.getItem(RELOAD_FLAG) === "1";
        if (wasControlled && !alreadyReloaded) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      } catch {
        // Best-effort cleanup — never block the app on it.
      }
    })();
  }, []);

  return null;
}
